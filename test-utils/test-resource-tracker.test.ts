import { jest } from "@jest/globals";
import { access } from "fs/promises";
import { join } from "path";
import { fileURLToPath } from "url";
import { TestResourceTracker } from "./test-resource-tracker";

// Avoid clashing with Node's __dirname after Jest transpilation
const TEST_UTILS_DIR = fileURLToPath(new URL(".", import.meta.url));
const trackingFile = join(TEST_UTILS_DIR, "../../.test-resources.json");

describe("TestResourceTracker", () => {
  let tracker: TestResourceTracker;
  beforeEach(async () => {
    tracker = new TestResourceTracker();
    // ensure clean file
    await tracker.load();
    const res = tracker.getResources();
    if (res.length) {
      // remove file for isolation
      await tracker.cleanup("token", "token").catch(() => {});
    }
  });

  afterEach(async () => {
    await tracker.cleanup("token", "token").catch(() => {});
  });

  it("tracks resources and persists to disk", async () => {
    await tracker.track("google_user", "user@example.com");
    await access(trackingFile); // should exist
    const resources = tracker.getResources();
    expect(resources.length).toBe(1);
    expect(resources[0].id).toBe("user@example.com");
  });

  it("loads and cleans up resources", async () => {
    await tracker.track("google_user", "delete@example.com");
    // mock fetch to avoid real network
    const fetchMock = jest
      .fn()
      .mockResolvedValue({ ok: true, status: 204, text: async () => "" });
    // Jest needs a global fetch mock in this test context. Cast via
    // `unknown` first to avoid the `no-explicit-any` ESLint rule.
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await tracker.cleanup("g", "m");

    expect(fetchMock).toHaveBeenCalled();
  });
});
