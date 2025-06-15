import { ProxyAgent, setGlobalDispatcher } from "undici";
import { globalTracker } from "./test-utils/test-resource-tracker";

const globalSetup = async () => {
  const proxy = process.env.https_proxy || process.env.HTTPS_PROXY;
  if (proxy) {
    const agent = new ProxyAgent(proxy);
    setGlobalDispatcher(agent);
    const origFetch: typeof fetch = globalThis.fetch;
    // Extend the built-in RequestInit type with the Undici dispatcher field
    type FetchInitWithDispatcher = RequestInit & { dispatcher: typeof agent };

    globalThis.fetch = ((
      input: RequestInfo | URL,
      init?: RequestInit,
    ) => origFetch(input, { ...init, dispatcher: agent } as FetchInitWithDispatcher)) as typeof fetch;
  }
  await globalTracker.load();
  const existingResources = globalTracker.getResources();
  if (existingResources.length > 0) {
    console.warn(
      `[WARNING] Found ${existingResources.length} resources from previous test run`
    );
    console.warn("[WARNING] Run jest.globalTeardown to clean them up");
  }

  // Get real tokens
  // Load test-environment helpers lazily so that Jest can start up quickly and
  // does not pay the cost of acquiring live API tokens when simply listing
  // tests.
  const { setupTestEnvironment } = await import("./test-utils/testEnv");
  await setupTestEnvironment();

  // Verify tokens were acquired
  if (!process.env.GOOGLE_ACCESS_TOKEN || !process.env.MICROSOFT_ACCESS_TOKEN) {
    throw new Error("Failed to acquire test tokens. Check your credentials.");
  }

  console.log("[SETUP] Test environment ready with live API tokens");
};

export default globalSetup;
