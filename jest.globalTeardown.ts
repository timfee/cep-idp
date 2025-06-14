import { ProxyAgent, setGlobalDispatcher } from "undici";
import { globalTracker } from "./test-utils/test-resource-tracker";

const globalTeardown = async () => {
  const proxy = process.env.https_proxy || process.env.HTTPS_PROXY;
  if (proxy) {
    const agent = new ProxyAgent(proxy);
    setGlobalDispatcher(agent);
    const origFetch: typeof fetch = globalThis.fetch;
    globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) =>
      origFetch(input, { dispatcher: agent, ...init })) as typeof fetch;
  }
  console.log("[TEARDOWN] Starting cleanup...");

  const googleToken = process.env.GOOGLE_ACCESS_TOKEN;
  const microsoftToken = process.env.MICROSOFT_ACCESS_TOKEN;

  if (!googleToken || !microsoftToken) {
    console.error("[TEARDOWN] Missing tokens for cleanup!");
    return;
  }

  // Clean up all tracked resources
  await globalTracker.cleanup(googleToken, microsoftToken);

  console.log("[TEARDOWN] Cleanup complete");
};

export default globalTeardown;
