import { globalTracker } from './__tests__/setup/test-resource-tracker';

const globalSetup = async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.AUTH_SECRET = 'test-secret-key-for-encryption-must-be-32-bytes-long';
  
  // Load any existing tracked resources (in case of previous failure)
  await globalTracker.load();
  const existingResources = globalTracker.getResources();
  if (existingResources.length > 0) {
    console.warn(`[WARNING] Found ${existingResources.length} resources from previous test run`);
    console.warn('[WARNING] Run jest.globalTeardown to clean them up');
  }
  
  // Get real tokens
  const { setupTestEnvironment } = await import('./test-utils/testEnv');
  await setupTestEnvironment();
  
  // Verify tokens were acquired
  if (!process.env.GOOGLE_ACCESS_TOKEN || !process.env.MICROSOFT_ACCESS_TOKEN) {
    throw new Error('Failed to acquire test tokens. Check your credentials.');
  }
  
  console.log('[SETUP] Test environment ready with live API tokens');
};

export default globalSetup;
