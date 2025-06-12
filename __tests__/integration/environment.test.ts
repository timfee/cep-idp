import { setupTestEnvironment, teardownTestEnvironment } from '@/test-utils/testEnv';

describe('Test environment setup', () => {
  beforeAll(async () => {
    await setupTestEnvironment();
  });

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  it('retrieves access tokens when credentials are provided', () => {
    const anyCreds =
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY ||
      (process.env.MS_TENANT_ID && process.env.MS_CLIENT_ID && process.env.MS_CLIENT_SECRET);
    if (anyCreds) {
      expect(
        process.env.GOOGLE_ACCESS_TOKEN || process.env.MICROSOFT_ACCESS_TOKEN,
      ).toBeDefined();
    } else {
      expect(process.env.GOOGLE_ACCESS_TOKEN).toBeUndefined();
      expect(process.env.MICROSOFT_ACCESS_TOKEN).toBeUndefined();
    }
  });
});
