import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';

let _client: ReturnType<typeof generateClient<Schema>> | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useAmplifyData(): any {
  if (!_client) _client = generateClient<Schema>();
  return _client;
}
