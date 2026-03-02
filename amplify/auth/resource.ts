import { defineAuth } from '@aws-amplify/backend';
import { postConfirmation } from '../functions/postConfirmation/resource';

/**
 * Cognito User Pool with three groups:
 *   APP_ADMINS      – Full access; manually promoted in Cognito console
 *   PROJECT_ADMINS  – Project-scoped access; promoted by App Admin
 *   TRANSCRIBERS    – Self-registered; auto-added via postConfirmation trigger
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  userAttributes: {
    givenName: {
      required: true,
      mutable: true,
    },
    familyName: {
      required: true,
      mutable: true,
    },
  },
  groups: ['APP_ADMINS', 'PROJECT_ADMINS', 'TRANSCRIBERS'],
  triggers: {
    postConfirmation,
  },
});
