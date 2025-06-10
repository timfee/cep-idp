// Discriminated union for API errors
export type ApiError =
  | { kind: 'structured'; code: number; status?: string; message: string }
  | { kind: 'text'; message: string }
  | { kind: 'unknown'; data: unknown };

// Type guard for structured errors
export function isStructuredError(obj: unknown): obj is { error: { code: number; message: string } } {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'error' in obj &&
    typeof (obj as Record<string, unknown>).error === 'object' &&
    obj.error !== null &&
    'code' in (obj as { error: Record<string, unknown> }).error &&
    'message' in (obj as { error: Record<string, unknown> }).error
  );
}

// Exhaustive check helper
export function assertNever(x: never): never {
  throw new Error('Unexpected value: ' + x);
}
