/**
 * Structured representation for different types of API errors.
 */
export type ApiError =
  | { kind: "structured"; code: number; status?: string; message: string }
  | { kind: "text"; message: string }
  | { kind: "unknown"; data: unknown };

/**
 * Determine if the provided object matches the expected structured error shape.
 *
 * @param obj - Value returned from an API call
 * @returns True if the object adheres to the structured error format
 */
export function isStructuredError(
  obj: unknown
): obj is { error: { code: number; message: string; status?: string } } {
  return (
    typeof obj === "object"
    && obj !== null
    && "error" in obj
    && typeof (obj as Record<string, unknown>).error === "object"
    && obj.error !== null
    && "code" in (obj as { error: Record<string, unknown> }).error
    && "message" in (obj as { error: Record<string, unknown> }).error
  );
}

/**
 * Utility for exhaustive type checking.
 *
 * @param x - Value that should never occur
 * @returns Never; always throws
 */
export function assertNever(x: never): never {
  throw new Error("Unexpected value: " + x);
}

/**
 * Best-effort parsing of an unknown error into a normalized form.
 *
 * @param error - Error thrown by an API call
 * @returns Normalized `ApiError` structure
 */
export function parseApiError(error: unknown): ApiError {
  if (error instanceof Error) {
    const message = error.message;
    try {
      const start = message.indexOf("{");
      const end = message.lastIndexOf("}");
      if (start !== -1 && end !== -1) {
        const parsed = JSON.parse(message.slice(start, end + 1));
        if (isStructuredError(parsed)) {
          return {
            kind: "structured",
            code: parsed.error.code,
            status: parsed.error.status,
            message: parsed.error.message
          };
        }
      }
    } catch {
      // Ignore parse errors
    }
    return { kind: "text", message };
  }
  return { kind: "unknown", data: error };
}
