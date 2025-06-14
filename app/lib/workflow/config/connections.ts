import { z } from "zod";

// Local imports
import { TokenSchema } from "../types";
import { BASE_URLS } from "../constants";

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
    base: BASE_URLS.GOOGLE_ADMIN,
    getAuthHeader: (tokens) => `Bearer ${tokens.google?.accessToken ?? ""}`,
  },
  googleCI: {
    base: BASE_URLS.GOOGLE_CI,
    getAuthHeader: (tokens) => `Bearer ${tokens.google?.accessToken ?? ""}`,
  },
  graphGA: {
    base: BASE_URLS.GRAPH_V1,
    getAuthHeader: (tokens) => `Bearer ${tokens.microsoft?.accessToken ?? ""}`,
  },
  graphBeta: {
    base: BASE_URLS.GRAPH_BETA,
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
