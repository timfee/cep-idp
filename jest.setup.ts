// Global test setup and teardown

beforeAll(async () => {
  // Validate test environment
  const requiredEnvVars = [
    "AUTH_SECRET",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "MICROSOFT_CLIENT_ID",
    "MICROSOFT_CLIENT_SECRET",
    "GOOGLE_SERVICE_ACCOUNT_KEY",
    "GOOGLE_ADMIN_EMAIL",
    "MS_TENANT_ID",
    "MS_CLIENT_ID",
    "MS_CLIENT_SECRET"
  ] as const;

  const missingVars = requiredEnvVars.filter((key) => !process.env[key]);
  if (missingVars.length > 0) {
    throw new Error(
      `Missing required test environment variables:\n${missingVars.join("\n")}\n\n`
        + "Please ensure these are set in .env.test.local"
    );
  }
});

afterAll(async () => {
  // Place any global teardown logic here
});
