import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'lptAudioBucket',
  access: (allow) => ({
    'audio/*': [
      allow.groups(['APP_ADMINS', 'PROJECT_ADMINS']).to(['read', 'write', 'delete']),
      allow.authenticated.to(['read']),
    ],
    'exports/*': [
      allow.groups(['APP_ADMINS', 'PROJECT_ADMINS']).to(['read', 'write', 'delete']),
    ],
  }),
});
