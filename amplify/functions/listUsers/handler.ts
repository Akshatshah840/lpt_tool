import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
  AdminListGroupsForUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';

const cognito = new CognitoIdentityProviderClient({});
const USER_POOL_ID = process.env.USER_POOL_ID!;

export const handler = async () => {
  // List all users in the pool
  const usersRes = await cognito.send(new ListUsersCommand({ UserPoolId: USER_POOL_ID }));
  const cognitoUsers = usersRes.Users ?? [];

  const results = await Promise.all(
    cognitoUsers.map(async (u) => {
      const username = u.Username!;
      const attrs = u.Attributes ?? [];
      const get = (name: string) => attrs.find(a => a.Name === name)?.Value ?? '';

      // Get groups for this user
      const groupsRes = await cognito.send(
        new AdminListGroupsForUserCommand({ UserPoolId: USER_POOL_ID, Username: username })
      );
      const groups = (groupsRes.Groups ?? []).map(g => g.GroupName ?? '');

      return {
        id: username,
        name: [get('given_name'), get('family_name')].filter(Boolean).join(' ') || get('email'),
        email: get('email'),
        groups,
      };
    })
  );

  return results;
};
