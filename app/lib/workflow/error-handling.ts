/**
 * Run a promise-returning function and capture any thrown error.
 *
 * @param fn - Asynchronous function to execute
 * @param errorMessage - Message logged when an error occurs
 * @returns Wrapped result indicating success or failure
 */
export async function safeAsync<T>(
  fn: () => Promise<T>,
  errorMessage: string
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    console.error(errorMessage, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : errorMessage
    };
  }
}
