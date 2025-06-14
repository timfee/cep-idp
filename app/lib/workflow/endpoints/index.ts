// Re-export endpoint groups for convenient imports elsewhere in the codebase.

export * as admin from "./admin";
export * as ci from "./ci";
export * as graph from "./graph";
export * as web from "./web";

// The previous `endpointRegistry` map has been removed.  Callers should import
// endpoint builders directly from the sub-modules above.
