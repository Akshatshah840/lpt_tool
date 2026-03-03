import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { listUsersFn } from '../functions/listUsers/resource';
import { updateUserGroupFn } from '../functions/updateUserGroup/resource';
import { exportResults } from '../functions/exportResults/resource';

const schema = a.schema({

  Project: a.model({
    name:        a.string().required(),
    description: a.string(),
    status:      a.enum(['OPEN', 'CLOSED']),
    tests:       a.hasMany('Test', 'projectId'),
    audioAssets: a.hasMany('AudioAsset', 'projectId'),
  }).authorization(allow => [
    allow.group('APP_ADMINS'),
    allow.group('PROJECT_ADMINS').to(['read', 'update']),
  ]),

  AudioAsset: a.model({
    projectId:              a.string().required(),
    project:                a.belongsTo('Project', 'projectId'),
    filename:               a.string().required(),
    s3Key:                  a.string().required(),
    referenceTranscription: a.string().required(),
    languageCode:           a.string().required(),
    description:            a.string(),
    fileSizeKb:             a.integer(),
    testAudioAssets:        a.hasMany('TestAudioAsset', 'audioAssetId'),
    transcriptions:         a.hasMany('Transcription', 'audioAssetId'),
  }).authorization(allow => [
    allow.groups(['APP_ADMINS', 'PROJECT_ADMINS']),
    allow.authenticated().to(['read']),
  ]),

  Test: a.model({
    projectId:    a.string().required(),
    project:      a.belongsTo('Project', 'projectId'),
    name:         a.string().required(),
    languageCode: a.string().required(),
    status:       a.enum(['CREATED', 'OPEN', 'CLOSED']),
    minAccuracy:  a.float().required(),
    description:  a.string(),
    expiresAt:    a.datetime(),
    audioAssets:  a.hasMany('TestAudioAsset', 'testId'),
    results:      a.hasMany('TestResult', 'testId'),
  }).authorization(allow => [
    allow.groups(['APP_ADMINS', 'PROJECT_ADMINS']),
    allow.authenticated().to(['read']),
  ]),

  TestAudioAsset: a.model({
    testId:       a.string().required(),
    audioAssetId: a.string().required(),
    test:         a.belongsTo('Test', 'testId'),
    audioAsset:   a.belongsTo('AudioAsset', 'audioAssetId'),
    sortOrder:    a.integer(),
  }).authorization(allow => [
    allow.groups(['APP_ADMINS', 'PROJECT_ADMINS']),
    allow.authenticated().to(['read']),
  ]),

  TestResult: a.model({
    testId:         a.string().required(),
    assignmentId:   a.string(),
    test:           a.belongsTo('Test', 'testId'),
    userId:         a.string().required(),
    userName:       a.string(),
    userEmail:      a.string(),
    status:         a.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']),
    overallWer:     a.float(),
    passed:         a.boolean(),
    startedAt:      a.datetime(),
    completedAt:    a.datetime(),
    transcriptions: a.hasMany('Transcription', 'testResultId'),
  }).authorization(allow => [
    allow.groups(['APP_ADMINS', 'PROJECT_ADMINS']),
    allow.owner().to(['read', 'create', 'update']),
  ]),

  Transcription: a.model({
    testResultId:  a.string().required(),
    audioAssetId:  a.string().required(),
    testResult:    a.belongsTo('TestResult', 'testResultId'),
    audioAsset:    a.belongsTo('AudioAsset', 'audioAssetId'),
    submittedText: a.string(),
    wer:           a.float(),
    sortOrder:     a.integer(),
  }).authorization(allow => [
    allow.groups(['APP_ADMINS', 'PROJECT_ADMINS']),
    allow.owner().to(['read', 'create', 'update']),
  ]),

  UserProfile: a.model({
    preferredLanguage: a.string(),
  }).authorization(allow => [
    allow.groups(['APP_ADMINS', 'PROJECT_ADMINS']),
    allow.owner().to(['create', 'read', 'update']),
  ]),

  // Custom Cognito operations (APP_ADMINS only)
  listCognitoUsers: a.query()
    .returns(a.json().array())
    .authorization(allow => [allow.group('APP_ADMINS')])
    .handler(a.handler.function(listUsersFn)),

  updateCognitoUserGroup: a.mutation()
    .arguments({ userId: a.string().required(), targetGroup: a.string().required() })
    .returns(a.json())
    .authorization(allow => [allow.group('APP_ADMINS')])
    .handler(a.handler.function(updateUserGroupFn)),

  // Export results to CSV / XLSX (APP_ADMINS + PROJECT_ADMINS)
  exportResults: a.mutation()
    .arguments({
      testId: a.string(),
      projectId: a.string(),
      format: a.string().required(),
    })
    .returns(a.json())
    .authorization(allow => [allow.groups(['APP_ADMINS', 'PROJECT_ADMINS'])])
    .handler(a.handler.function(exportResults)),

});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
