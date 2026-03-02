import { defineFunction } from '@aws-amplify/backend';

export const exportResults = defineFunction({
  name: 'exportResults',
  entry: './handler.ts',
  timeoutSeconds: 60,
  environment: {
    STORAGE_BUCKET_NAME: '',
  },
});
