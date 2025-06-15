export { createLiveApiContext } from '../../test-utils/live-api-context';

// Jest treats any file under __tests__ as a test suite. Provide a no-op test
// so the suite is considered valid without executing setup code.
test('live api context setup file loaded', () => {
  expect(true).toBe(true);
});
