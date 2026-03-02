import { defineFunction } from '@aws-amplify/backend';

export const sendEmail = defineFunction({
  name: 'sendEmail',
  entry: './handler.ts',
  environment: {
    SES_FROM_EMAIL: '',
    APP_URL: '',
  },
});
