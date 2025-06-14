import { globalTracker } from './__tests__/setup/test-resource-tracker';

const globalTeardown = async () => {
  console.log('[TEARDOWN] Starting cleanup...');
  
  const googleToken = process.env.GOOGLE_ACCESS_TOKEN;
  const microsoftToken = process.env.MICROSOFT_ACCESS_TOKEN;
  
  if (!googleToken || !microsoftToken) {
    console.error('[TEARDOWN] Missing tokens for cleanup!');
    return;
  }
  
  // Clean up all tracked resources
  await globalTracker.cleanup(googleToken, microsoftToken);
  
  console.log('[TEARDOWN] Cleanup complete');
};

export default globalTeardown;
