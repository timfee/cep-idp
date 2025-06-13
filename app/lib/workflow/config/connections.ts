import { z } from "zod";

// Local imports
import { TokenSchema } from "../types";

/**
 * Zod schema describing a single connection configuration.  Validation runs at
 * module load so the application fails fast when a definition is malformed.
 */
export const ConnectionConfigSchema = z.object({
  base: z.string().url(),
  getAuthHeader: z
    .function()
    .args(
      z.object({
        google: TokenSchema.optional(),
        microsoft: TokenSchema.optional(),
      })
    )
    .returns(z.string()),
});

export type ConnectionConfig = z.infer<typeof ConnectionConfigSchema>;

/**
 * All remote API hosts the workflow may call.  New hosts should be added here
 * and validated against the {@link ConnectionConfigSchema}.
 */
export const connections: Record<string, ConnectionConfig> = {
  googleAdmin: {
    base: "https://admin.googleapis.com/admin/directory/v1",
    getAuthHeader: (tokens) => `Bearer ${tokens.google?.accessToken ?? ""}`,
  },
  googleCI: {
    base: "https://cloudidentity.googleapis.com/v1",
    getAuthHeader: (tokens) => `Bearer ${tokens.google?.accessToken ?? ""}`,
  },
  graphGA: {
    base: "https://graph.microsoft.com/v1.0",
    getAuthHeader: (tokens) => `Bearer ${tokens.microsoft?.accessToken ?? ""}`,
  },
  graphBeta: {
    base: "https://graph.microsoft.com/beta",
    getAuthHeader: (tokens) => `Bearer ${tokens.microsoft?.accessToken ?? ""}`,
  },
  public: {
    base: "",
    getAuthHeader: () => "",
  },
};

// --- Validate configuration at module load ---------------------------------
for (const [name, cfg] of Object.entries(connections)) {
  try {
    ConnectionConfigSchema.parse(cfg);
  } catch (error) {
    throw new Error(`Invalid connection config for ${name}: ${error}`);
  }
}
