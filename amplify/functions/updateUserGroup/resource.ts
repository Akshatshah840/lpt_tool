import { defineFunction } from '@aws-amplify/backend';

export const updateUserGroupFn = defineFunction({
  name: 'updateUserGroup',
  resourceGroupName: 'data',
});
