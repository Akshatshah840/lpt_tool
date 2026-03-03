import type { AppSyncResolverHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as XLSX from 'xlsx';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3 = new S3Client({});

interface ExportInput {
  testId?: string;
  projectId?: string;
  format: 'CSV' | 'XLSX';
}

interface ExportOutput {
  downloadUrl: string;
  expiresAt: string;
}

export const handler: AppSyncResolverHandler<ExportInput, ExportOutput> = async (event) => {
  const { testId, projectId, format } = event.arguments;
  const bucketName = process.env.STORAGE_BUCKET_NAME ?? '';

  // Fetch results from DynamoDB
  const rows: Record<string, unknown>[] = [];

  // Query TestResults for the specified test or project
  const testResultTable = process.env.TEST_RESULT_TABLE_NAME ?? 'TestResult';
  const transcriptionTable = process.env.TRANSCRIPTION_TABLE_NAME ?? 'Transcription';
  const audioAssetTable = process.env.AUDIO_ASSET_TABLE_NAME ?? 'AudioAsset';
  const testTable = process.env.TEST_TABLE_NAME ?? 'Test';

  let testResults: Record<string, unknown>[];

  if (testId) {
    const resultsResp = await ddb.send(new ScanCommand({
      TableName: testResultTable,
      FilterExpression: 'testId = :testId',
      ExpressionAttributeValues: { ':testId': testId },
    }));
    testResults = (resultsResp.Items ?? []) as Record<string, unknown>[];
  } else {
    const resultsResp = await ddb.send(new ScanCommand({ TableName: testResultTable }));
    testResults = (resultsResp.Items ?? []) as Record<string, unknown>[];
  }

  for (const result of testResults) {
    // Get test info
    const testResp = await ddb.send(new GetCommand({
      TableName: testTable,
      Key: { id: result.testId },
    }));
    const test = testResp.Item;

    // Get transcriptions for this result
    const transResp = await ddb.send(new ScanCommand({
      TableName: transcriptionTable,
      FilterExpression: 'testResultId = :id',
      ExpressionAttributeValues: { ':id': result.id },
    }));
    const transcriptions = (transResp.Items ?? []).sort(
      (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
    );

    for (let i = 0; i < transcriptions.length; i++) {
      const trans = transcriptions[i];

      // Get audio asset info
      const audioResp = await ddb.send(new GetCommand({
        TableName: audioAssetTable,
        Key: { id: trans.audioAssetId },
      }));
      const audio = audioResp.Item;

      const accuracy = trans.wer !== undefined ? (1 - Math.min(trans.wer as number, 1)) * 100 : null;
      const overallAccuracy =
        result.overallWer !== undefined ? (1 - Math.min(result.overallWer as number, 1)) * 100 : null;

      rows.push({
        'Result ID': result.id,
        'Test Name': test?.name ?? '',
        Language: test?.languageCode ?? '',
        'Transcriber Name': result.userName ?? '',
        Email: result.userEmail ?? '',
        'Clip #': i + 1,
        'Audio File': audio?.filename ?? '',
        'Reference Text': audio?.referenceTranscription ?? '',
        'Submitted Text': trans.submittedText ?? '',
        'Clip WER': typeof trans.wer === 'number' ? trans.wer.toFixed(4) : '',
        'Clip Accuracy %': accuracy !== null ? accuracy.toFixed(1) : '',
        'Overall WER': typeof result.overallWer === 'number' ? result.overallWer.toFixed(4) : '',
        'Overall Accuracy %': overallAccuracy !== null ? overallAccuracy.toFixed(1) : '',
        'Pass/Fail': result.passed === true ? 'PASS' : result.passed === false ? 'FAIL' : 'PENDING',
        'Completed At': result.completedAt ?? '',
      });
    }
  }

  // Generate workbook
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Results');

  let fileBuffer: Buffer;
  let contentType: string;
  let ext: string;

  if (format === 'CSV') {
    const csv = XLSX.utils.sheet_to_csv(ws);
    fileBuffer = Buffer.from(csv, 'utf-8');
    contentType = 'text/csv';
    ext = 'csv';
  } else {
    fileBuffer = Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
    contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    ext = 'xlsx';
  }

  const key = `exports/lpt-results-${Date.now()}.${ext}`;

  await s3.send(new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType,
  }));

  const expiresIn = 15 * 60; // 15 minutes
  const downloadUrl = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: bucketName, Key: key }),
    { expiresIn }
  );

  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  return { downloadUrl, expiresAt };
};
