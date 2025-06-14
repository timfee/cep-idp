// Lightweight types kept for compatibility with code that previously imported
// Connection and Endpoint definitions from the workflow legacy layer.  These
// wrappers simply alias the validated types from the current connection /
// endpoint builders so importing files continue to compile until they are
// migrated.

import type { ConnectionConfig } from "@/app/lib/workflow/config/connections";

export type Connection = ConnectionConfig;

// Generic endpoint signature – the concrete builders return typed functions so
// callers should migrate to those instead of relying on this placeholder.
export type Endpoint = (...args: unknown[]) => Promise<unknown>;
