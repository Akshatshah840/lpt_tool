import type { AppSyncResolverHandler } from 'aws-lambda';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const ses = new SESClient({});

interface SendEmailInput {
  type: 'ASSIGNMENT' | 'COMPLETION';
  toEmail: string;
  toName: string;
  testName: string;
  languageCode?: string;
  accuracy?: number;
  passed?: boolean;
}

interface SendEmailOutput {
  success: boolean;
  messageId?: string;
}

const FROM_EMAIL = process.env.SES_FROM_EMAIL ?? 'noreply@lpt-tool.example.com';
const APP_URL = process.env.APP_URL ?? 'https://lpt-tool.example.com';

function buildAssignmentEmail(toName: string, testName: string, languageCode: string) {
  return {
    subject: `You've been assigned a ${languageCode} transcription test`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6366f1;">Language Proficiency Test — New Assignment</h2>
        <p>Hello ${toName},</p>
        <p>You have been assigned a new transcription test:</p>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <strong>Test:</strong> ${testName}<br>
          <strong>Language:</strong> ${languageCode}
        </div>
        <p>Please log in to complete your test:</p>
        <a href="${APP_URL}" style="
          display: inline-block;
          background: #6366f1;
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: bold;
        ">Go to Dashboard</a>
        <p style="color: #6b7280; margin-top: 24px; font-size: 14px;">
          This is an automated message from LPT Tool. Please do not reply.
        </p>
      </div>
    `,
    text: `Hello ${toName},\n\nYou have been assigned a new transcription test: ${testName} (${languageCode}).\n\nPlease log in at ${APP_URL} to complete your test.\n\nLPT Tool`,
  };
}

function buildCompletionEmail(toName: string, testName: string, accuracy: number, passed: boolean) {
  const statusColor = passed ? '#22c55e' : '#ef4444';
  const statusText = passed ? 'PASS' : 'FAIL';

  return {
    subject: `Your test results: ${accuracy.toFixed(1)}% accuracy — ${statusText}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6366f1;">Language Proficiency Test — Results</h2>
        <p>Hello ${toName},</p>
        <p>Your transcription test <strong>${testName}</strong> has been scored:</p>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0; text-align: center;">
          <div style="font-size: 48px; font-weight: bold; color: ${statusColor};">${statusText}</div>
          <div style="font-size: 24px; color: #374151;">${accuracy.toFixed(1)}% Accuracy</div>
        </div>
        <a href="${APP_URL}" style="
          display: inline-block;
          background: #6366f1;
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: bold;
        ">View My Results</a>
        <p style="color: #6b7280; margin-top: 24px; font-size: 14px;">
          This is an automated message from LPT Tool. Please do not reply.
        </p>
      </div>
    `,
    text: `Hello ${toName},\n\nYour test "${testName}" result: ${statusText} — ${accuracy.toFixed(1)}% accuracy.\n\nView your results at ${APP_URL}\n\nLPT Tool`,
  };
}

export const handler: AppSyncResolverHandler<SendEmailInput, SendEmailOutput> = async (event) => {
  const { type, toEmail, toName, testName, languageCode, accuracy, passed } = event.arguments;

  let emailContent: { subject: string; html: string; text: string };

  if (type === 'ASSIGNMENT') {
    emailContent = buildAssignmentEmail(toName, testName, languageCode ?? '');
  } else {
    emailContent = buildCompletionEmail(toName, testName, accuracy ?? 0, passed ?? false);
  }

  const result = await ses.send(new SendEmailCommand({
    Source: FROM_EMAIL,
    Destination: { ToAddresses: [toEmail] },
    Message: {
      Subject: { Data: emailContent.subject, Charset: 'UTF-8' },
      Body: {
        Html: { Data: emailContent.html, Charset: 'UTF-8' },
        Text: { Data: emailContent.text, Charset: 'UTF-8' },
      },
    },
  }));

  return {
    success: true,
    messageId: result.MessageId,
  };
};
