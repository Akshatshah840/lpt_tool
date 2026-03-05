import type { AppSyncResolverHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

interface TranscriptionItem {
  id: string;
  audioAssetId: string;
  submittedText: string;
  sortOrder: number;
}

interface CalculateWERInput {
  testResultId: string;
  transcriptions: string; // JSON-encoded TranscriptionItem[]
  minAccuracy: number;
  testId: string;
}

interface CalculateWEROutput {
  testResultId: string;
  overallWer: number;
  passed: boolean;
  clipResults: Array<{ id: string; wer: number }>;
}

/**
 * Word Error Rate: Levenshtein distance on word tokens, normalized by reference length.
 * Returns 0.0 (perfect) to >1.0 (many insertions).
 */
function computeWER(reference: string, hypothesis: string): number {
  const ref = reference.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const hyp = hypothesis.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const n = ref.length;
  const m = hyp.length;

  if (n === 0) return m === 0 ? 0 : 1;

  const dp: number[][] = Array.from({ length: n + 1 }, (_, i) =>
    Array(m + 1).fill(0)
  );
  for (let i = 0; i <= n; i++) dp[i][0] = i;
  for (let j = 0; j <= m; j++) dp[0][j] = j;

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      dp[i][j] =
        ref[i - 1] === hyp[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }

  return dp[n][m] / n;
}

export const handler: AppSyncResolverHandler<CalculateWERInput, CalculateWEROutput> = async (event) => {
  const { testResultId, transcriptions: transcriptionsJson, minAccuracy } = event.arguments;

  // Validate input
  if (!testResultId || !transcriptionsJson) {
    throw new Error('Missing required arguments: testResultId, transcriptions');
  }

  let items: TranscriptionItem[];
  try {
    items = JSON.parse(transcriptionsJson);
  } catch {
    throw new Error('Invalid transcriptions JSON');
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('transcriptions must be a non-empty array');
  }

  // Check idempotency: if TestResult already COMPLETED, return early
  const testResultTableName = process.env.TEST_RESULT_TABLE_NAME ?? 'TestResult';
  const existingResult = await ddb.send(new GetCommand({
    TableName: testResultTableName,
    Key: { id: testResultId },
  }));
  if (existingResult.Item?.status === 'COMPLETED') {
    return {
      testResultId,
      overallWer: existingResult.Item.overallWer ?? 0,
      passed: existingResult.Item.passed ?? false,
      clipResults: [],
    };
  }

  const audioAssetTableName  = process.env.AUDIO_ASSET_TABLE_NAME  ?? 'AudioAsset';
  const transcriptionTableName = process.env.TRANSCRIPTION_TABLE_NAME ?? 'Transcription';

  const clipResults: Array<{ id: string; wer: number }> = [];
  let totalWer = 0;

  for (const t of items) {
    // Fetch referenceTranscription from AudioAsset table (never sent to client)
    const assetRes = await ddb.send(new GetCommand({
      TableName: audioAssetTableName,
      Key: { id: t.audioAssetId },
    }));
    const referenceTranscription: string = assetRes.Item?.referenceTranscription ?? '';

    const wer = computeWER(referenceTranscription, t.submittedText || '');
    clipResults.push({ id: t.id, wer });
    totalWer += wer;

    // Update Transcription record with WER and submittedText
    await ddb.send(new UpdateCommand({
      TableName: transcriptionTableName,
      Key: { id: t.id },
      UpdateExpression: 'SET #wer = :wer, submittedText = :submittedText',
      ExpressionAttributeNames: { '#wer': 'wer' },
      ExpressionAttributeValues: {
        ':wer': wer,
        ':submittedText': t.submittedText || '',
      },
    }));
  }

  const overallWer = totalWer / items.length;
  const accuracy = 1 - Math.min(overallWer, 1);
  const passed = accuracy >= minAccuracy;
  const completedAt = new Date().toISOString();

  // Update TestResult as COMPLETED
  await ddb.send(new UpdateCommand({
    TableName: testResultTableName,
    Key: { id: testResultId },
    UpdateExpression:
      'SET #status = :status, overallWer = :wer, passed = :passed, completedAt = :completedAt',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: {
      ':status': 'COMPLETED',
      ':wer': overallWer,
      ':passed': passed,
      ':completedAt': completedAt,
    },
  }));

  return {
    testResultId,
    overallWer,
    passed,
    clipResults,
  };
};
