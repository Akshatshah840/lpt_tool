import {
  CognitoIdentityProviderClient,
  AdminListGroupsForUserCommand,
  AdminAddUserToGroupCommand,
  AdminRemoveUserFromGroupCommand,
} from '@aws-sdk/client-cognito-identity-provider';

const cognito = new CognitoIdentityProviderClient({});
const USER_POOL_ID = process.env.USER_POOL_ID!;

const ALLOWED_TARGETS = ['TRANSCRIBERS', 'PROJECT_ADMINS'];

export const handler = async (event: { arguments: { userId: string; targetGroup: string } }) => {
  const { userId, targetGroup } = event.arguments;

  if (!ALLOWED_TARGETS.includes(targetGroup)) {
    throw new Error(`Invalid targetGroup: ${targetGroup}. Must be one of ${ALLOWED_TARGETS.join(', ')}`);
  }

  // Get current groups (excluding APP_ADMINS — never touch those)
  const groupsRes = await cognito.send(
    new AdminListGroupsForUserCommand({ UserPoolId: USER_POOL_ID, Username: userId })
  );
  const currentGroups = (groupsRes.Groups ?? [])
    .map(g => g.GroupName ?? '')
    .filter(g => g !== 'APP_ADMINS');

  // Remove from all non-APP_ADMINS groups
  await Promise.all(
    currentGroups.map(group =>
      cognito.send(new AdminRemoveUserFromGroupCommand({
        UserPoolId: USER_POOL_ID,
        Username: userId,
        GroupName: group,
      }))
    )
  );

  // Add to target group
  await cognito.send(new AdminAddUserToGroupCommand({
    UserPoolId: USER_POOL_ID,
    Username: userId,
    GroupName: targetGroup,
  }));

  return { success: true, userId, targetGroup };
};
