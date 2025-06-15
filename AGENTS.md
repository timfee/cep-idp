# AGENTS

This repository runs integration tests against live Google and Microsoft APIs. Jest uses `ts-jest` with Next.js presets.

Each directory may include its own `AGENTS.md` describing local conventions. Add or update these docs whenever special setup or troubleshooting notes are required.

## Proxy-aware fetch
Node's `fetch` ignores `HTTPS_PROXY` by default. A shared helper (`__tests__/helpers/proxyFetch.ts`) installs `undici`'s `ProxyAgent` for Jest so test requests use the proxy. Import this helper from `jest.setup.ts`, `jest.globalSetup.ts` and `jest.globalTeardown.ts`. If network errors show `ENETUNREACH`, ensure the `undici` package is installed and the `HTTPS_PROXY` variable is set.

Google APIs are reachable once the proxy agent is configured. Running
`node -e "require('undici'); fetch('https://admin.googleapis.com')"`
returns a 404 response, proving connectivity. Earlier "fetch failed" errors
were due to Node not using the proxy.

## TypeScript / ESM
Tests stay in TypeScript and run under Jest with ESM support. `tsconfig.spec.json` keeps `module` as `CommonJS` while `ts-jest` handles the ESM transform.

## 4xx error handling
Initial runs returned 4xx responses because endpoints used incorrect parameters. After comparing with the Google Admin API docs, the following fixes were applied:

- `getRoleAssign` now uses the `userKey` query parameter instead of `assignedTo`.
- Org Unit tests pass the orgUnitPath without a leading slash.

When encountering new 4xx errors, cross-check the API documentation and adjust either the endpoint helper or the test data.
Some integration tests deliberately trigger 4xx responses (e.g. invalid role or duplicate creation) to verify error handling. In those cases a 4xx status indicates success.

## Test Fixtures
Test fixtures in `__tests__/fixtures/` represent real API responses. The `_metadata` field is added by the test harness for debugging and should be ignored by schemas using `.passthrough()`.

## Type Safety in Tests
All endpoints return typed responses. Tests can leverage these types:

```ts
const result: ListDomainsResponse = await listDomains(ctx, params);
```
