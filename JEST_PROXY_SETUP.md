# Jest Proxy Setup

This document captures the steps taken to run the Jest test suite when the environment requires all
HTTP/HTTPS requests to go through a proxy.

## Problem

Node's built-in `fetch` does not automatically honour the `HTTPS_PROXY`/`https_proxy`
environment variables. The container used for testing relies on those variables for all
outbound network traffic. As a result, calls made with `fetch` inside the tests would fail
with `ENETUNREACH` errors even though `curl` worked. Connectivity to `admin.googleapis.com`
and other APIs is available; the failures stem purely from `fetch` bypassing the proxy.

## Solution

[`undici`](https://github.com/nodejs/undici) provides a `ProxyAgent` that can be
installed as the global dispatcher. By wrapping `globalThis.fetch` in the setup files,
all requests from the tests (and from the global setup/teardown scripts) are routed via
the proxy automatically.

```ts
import { setupProxyFetch } from "./__tests__/helpers/proxyFetch";

setupProxyFetch();
```

`setupProxyFetch` applies the same `ProxyAgent` logic and is imported by
`jest.setup.ts`, `jest.globalSetup.ts` and `jest.globalTeardown.ts` so every
phase of the test lifecycle uses the proxy.

## Minimal Changes

The test utilities remain TypeScript files. `ts-jest` is configured in
`jest.config.ts` with the `default-esm` preset so no additional build step or JavaScript
copies are required. `tsconfig.spec.json` sets the module system to `NodeNext` to match
Jest's ESM execution.

With this configuration, the tests are able to acquire live tokens and communicate with
the external APIs through the proxy.

## Handling 4xx responses

Some early test runs returned 4xx errors from the Google Admin APIs. After comparing with the official API documentation we corrected a few request details:

- `getRoleAssign` passes the `userKey` query parameter instead of the deprecated `assignedTo`.
- Org Unit tests send the `orgUnitPath` without a leading slash.

These adjustments eliminated the 400/404 responses once the proxy setup was in place.
Certain tests deliberately trigger 4xx responses to verify that error handling works correctly. When a test expects a failure, a 4xx status means the scenario succeeded.
