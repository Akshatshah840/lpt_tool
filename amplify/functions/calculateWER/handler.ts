import type { AppSyncResolverHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

interface CalculateWERInput {
  testResultId: string;
  transcriptions: Array<{
    id: string;
    audioAssetId: string;
    submittedText: string;
    referenceTranscription: string;
    sortOrder: number;
  }>;
  minAccuracy: number;
  testId: string;
  assignmentId?: string;
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
function calculateWER(reference: string, hypothesis: string): number {
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
  const { testResultId, transcriptions, minAccuracy, testId, assignmentId } = event.arguments;

  const clipResults: Array<{ id: string; wer: number }> = [];
  let totalWer = 0;

  // Calculate WER for each clip and update DynamoDB
  for (const t of transcriptions) {
    const wer = calculateWER(t.referenceTranscription, t.submittedText || '');
    clipResults.push({ id: t.id, wer });
    totalWer += wer;

    // Update Transcription record with calculated WER
    const transcriptionTableName = process.env.TRANSCRIPTION_TABLE_NAME ?? 'Transcription';
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

  const overallWer = transcriptions.length > 0 ? totalWer / transcriptions.length : 0;
  const accuracy = 1 - Math.min(overallWer, 1);
  const passed = accuracy >= minAccuracy;
  const completedAt = new Date().toISOString();

  // Update TestResult
  const testResultTableName = process.env.TEST_RESULT_TABLE_NAME ?? 'TestResult';
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

  // Update TestAssignment if provided
  if (assignmentId) {
    const assignmentTableName = process.env.TEST_ASSIGNMENT_TABLE_NAME ?? 'TestAssignment';
    await ddb.send(new UpdateCommand({
      TableName: assignmentTableName,
      Key: { id: assignmentId },
      UpdateExpression: 'SET #status = :status',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':status': 'COMPLETED' },
    }));
  }

  return {
    testResultId,
    overallWer,
    passed,
    clipResults,
  };
};
