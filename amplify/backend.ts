import { defineBackend } from '@aws-amplify/backend';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import { calculateWER } from './functions/calculateWER/resource';
import { exportResults } from './functions/exportResults/resource';
import { sendEmail } from './functions/sendEmail/resource';
import { listUsersFn } from './functions/listUsers/resource';
import { updateUserGroupFn } from './functions/updateUserGroup/resource';

const backend = defineBackend({
  auth,
  data,
  storage,
  calculateWER,
  exportResults,
  sendEmail,
  listUsersFn,
  updateUserGroupFn,
});

const poolId  = backend.auth.resources.userPool.userPoolId;
const poolArn = backend.auth.resources.userPool.userPoolArn;

[backend.listUsersFn, backend.updateUserGroupFn].forEach(fn => {
  fn.resources.lambda.addEnvironment('USER_POOL_ID', poolId);
  fn.resources.lambda.addToRolePolicy(new PolicyStatement({
    effect: Effect.ALLOW,
    actions: [
      'cognito-idp:ListUsers',
      'cognito-idp:AdminListGroupsForUser',
      'cognito-idp:AdminAddUserToGroup',
      'cognito-idp:AdminRemoveUserFromGroup',
    ],
    resources: [poolArn],
  }));
});
