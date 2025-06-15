import { ProxyAgent, setGlobalDispatcher } from 'undici';

export function setupProxyFetch() {
  const proxy = process.env.https_proxy || process.env.HTTPS_PROXY;
  if (!proxy) return;
  const agent = new ProxyAgent(proxy);
  setGlobalDispatcher(agent);
  const origFetch: typeof fetch = globalThis.fetch;
  type FetchInitWithDispatcher = RequestInit & { dispatcher: typeof agent };
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) =>
    origFetch(input, { ...init, dispatcher: agent } as FetchInitWithDispatcher)) as typeof fetch;
}
