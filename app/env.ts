import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

// Parse and validate environment variables for both server and shared contexts.
// In production/dev, throws on missing required values. In tests, returns whatever is set.
export const env = createEnv({
  server: {
    AUTH_SECRET: z.string().min(1),
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
    MICROSOFT_CLIENT_ID: z.string().min(1),
    MICROSOFT_CLIENT_SECRET: z.string().min(1)
  },
  shared: {
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development")
  },
  runtimeEnv: {
    AUTH_SECRET: process.env.AUTH_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    MICROSOFT_CLIENT_ID: process.env.MICROSOFT_CLIENT_ID,
    MICROSOFT_CLIENT_SECRET: process.env.MICROSOFT_CLIENT_SECRET,
    NODE_ENV: process.env.NODE_ENV
  }
});
