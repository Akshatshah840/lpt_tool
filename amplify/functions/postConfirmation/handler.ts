import type { PostConfirmationTriggerHandler } from 'aws-lambda';
import {
  CognitoIdentityProviderClient,
  AdminAddUserToGroupCommand,
} from '@aws-sdk/client-cognito-identity-provider';

const cognito = new CognitoIdentityProviderClient({});

/**
 * Post-confirmation trigger: automatically adds every newly confirmed user
 * to the TRANSCRIBERS Cognito group.
 */
export const handler: PostConfirmationTriggerHandler = async (event) => {
  const { userPoolId, userName } = event;

  await cognito.send(new AdminAddUserToGroupCommand({
    UserPoolId: userPoolId,
    Username: userName,
    GroupName: 'TRANSCRIBERS',
  }));

  return event;
};
