import { defineBackend } from '@aws-amplify/backend';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import { Function as LambdaFunction } from 'aws-cdk-lib/aws-lambda';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import { calculateWER } from './functions/calculateWER/resource';
import { exportResultsFn } from './functions/exportResults/resource';
import { listUsersFn } from './functions/listUsers/resource';
import { updateUserGroupFn } from './functions/updateUserGroup/resource';

const backend = defineBackend({
  auth,
  data,
  storage,
  calculateWER,
  exportResultsFn,
  listUsersFn,
  updateUserGroupFn,
});

// ── Cognito User Pool ────────────────────────────────────────────────────────
const poolId  = backend.auth.resources.userPool.userPoolId;
const poolArn = backend.auth.resources.userPool.userPoolArn;

[backend.listUsersFn, backend.updateUserGroupFn].forEach(fn => {
  const lambda = fn.resources.lambda as LambdaFunction;
  lambda.addEnvironment('USER_POOL_ID', poolId);
  lambda.addToRolePolicy(new PolicyStatement({
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

// ── DynamoDB table names & ARNs ──────────────────────────────────────────────
const tables               = backend.data.resources.tables;
const testResultTableName  = tables['TestResult'].tableName;
const testResultTableArn   = tables['TestResult'].tableArn;
const transTableName       = tables['Transcription'].tableName;
const transTableArn        = tables['Transcription'].tableArn;
const audioAssetTableName  = tables['AudioAsset'].tableName;
const audioAssetTableArn   = tables['AudioAsset'].tableArn;
const testTableName        = tables['Test'].tableName;
const testTableArn         = tables['Test'].tableArn;

// ── S3 bucket ────────────────────────────────────────────────────────────────
const bucketName = backend.storage.resources.bucket.bucketName;
const bucketArn  = backend.storage.resources.bucket.bucketArn;

// ── exportResults Lambda ─────────────────────────────────────────────────────
const exportLambda = backend.exportResultsFn.resources.lambda as LambdaFunction;
exportLambda.addEnvironment('STORAGE_BUCKET_NAME',      bucketName);
exportLambda.addEnvironment('TEST_RESULT_TABLE_NAME',   testResultTableName);
exportLambda.addEnvironment('TRANSCRIPTION_TABLE_NAME', transTableName);
exportLambda.addEnvironment('AUDIO_ASSET_TABLE_NAME',   audioAssetTableName);
exportLambda.addEnvironment('TEST_TABLE_NAME',          testTableName);

exportLambda.addToRolePolicy(new PolicyStatement({
  effect: Effect.ALLOW,
  actions: ['dynamodb:Query', 'dynamodb:Scan', 'dynamodb:GetItem'],
  resources: [
    testResultTableArn,  `${testResultTableArn}/index/*`,
    transTableArn,       `${transTableArn}/index/*`,
    audioAssetTableArn,
    testTableArn,
  ],
}));

exportLambda.addToRolePolicy(new PolicyStatement({
  effect: Effect.ALLOW,
  actions: ['s3:PutObject', 's3:GetObject'],
  resources: [`${bucketArn}/exports/*`],
}));

// ── calculateWER Lambda ──────────────────────────────────────────────────────
const werLambda = backend.calculateWER.resources.lambda as LambdaFunction;
werLambda.addEnvironment('TEST_RESULT_TABLE_NAME',    testResultTableName);
werLambda.addEnvironment('TRANSCRIPTION_TABLE_NAME',  transTableName);
werLambda.addEnvironment('AUDIO_ASSET_TABLE_NAME',    audioAssetTableName);

werLambda.addToRolePolicy(new PolicyStatement({
  effect: Effect.ALLOW,
  actions: ['dynamodb:UpdateItem', 'dynamodb:GetItem'],
  resources: [testResultTableArn, transTableArn, audioAssetTableArn],
}));
