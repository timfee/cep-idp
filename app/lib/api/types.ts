import { Connection, Endpoint, Token, LogEntry } from "../workflow";

export interface ApiRequestOptions {
  endpoint: Endpoint;
  connections: Record<string, Connection>;
  variables: Record<string, string>;
  tokens: { google?: Token; microsoft?: Token };
  body?: unknown;
  throwOnMissingVars?: boolean;
  onLog?: (entry: LogEntry) => void;
}
