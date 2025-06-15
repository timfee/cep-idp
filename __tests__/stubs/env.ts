export const env = {
  AUTH_SECRET: process.env.AUTH_SECRET || "test-secret",
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || "",
  MICROSOFT_CLIENT_ID: process.env.MICROSOFT_CLIENT_ID || "",
  MICROSOFT_CLIENT_SECRET: process.env.MICROSOFT_CLIENT_SECRET || "",
  NODE_ENV: "test"
};
