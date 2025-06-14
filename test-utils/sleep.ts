/**
 * Simple promise-based sleep helper for test environments.
 *
 * Usage: `await sleep(2000)` – pauses execution for ~2 seconds.
 *
 * Note: we keep this utility in the `test-utils` folder so it is only
 * bundled for the test suite and tree-shaken from production builds.
 */

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));
