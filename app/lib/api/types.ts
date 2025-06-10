import { Connection, Endpoint, LogEntry, Token } from "../workflow";

/**
 * Options describing how a workflow API request should be executed.
 */
export interface ApiRequestOptions {
  endpoint: Endpoint;
  connections: Record<string, Connection>;
  variables: Record<string, string>;
  tokens: { google?: Token; microsoft?: Token };
  body?: unknown;
  throwOnMissingVars?: boolean;
  onLog?: (entry: LogEntry) => void;
}
