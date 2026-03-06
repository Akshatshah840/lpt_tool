import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'lptAudioBucket',
  access: (allow) => ({
    'audio/*': [
      allow.groups(['APP_ADMINS', 'PROJECT_ADMINS']).to(['read', 'write', 'delete']),
      allow.groups(['TRANSCRIBERS']).to(['read']),
      // fallback for any authenticated user not yet assigned a group
      allow.authenticated.to(['read']),
    ],
    'exports/*': [
      allow.groups(['APP_ADMINS', 'PROJECT_ADMINS']).to(['read', 'write', 'delete']),
    ],
  }),
});
