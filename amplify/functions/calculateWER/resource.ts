import { defineFunction } from '@aws-amplify/backend';

export const calculateWER = defineFunction({
  name: 'calculateWER',
  entry: './handler.ts',
  environment: {},
});
