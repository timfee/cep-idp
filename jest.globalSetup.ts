export default async () => {
  process.env.AUTH_SECRET ??= 'test-secret';
  process.env.GOOGLE_CLIENT_ID ??= 'dummy';
  process.env.GOOGLE_CLIENT_SECRET ??= 'dummy';
  process.env.MICROSOFT_CLIENT_ID ??= 'dummy';
  process.env.MICROSOFT_CLIENT_SECRET ??= 'dummy';
  const { setupTestEnvironment } = await import('./test-utils/testEnv');
  await setupTestEnvironment();
};
