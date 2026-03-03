import { defineFunction } from '@aws-amplify/backend';

export const exportResultsFn = defineFunction({
  name: 'exportResults',
  entry: './handler.ts',
  timeoutSeconds: 60,
  resourceGroupName: 'data',
});
