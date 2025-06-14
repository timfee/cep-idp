# AGENTS

These helpers assume tests run against live APIs. `createLiveApiContext` uses tokens from environment variables. They rely on Node's `fetch`; the Jest setup injects a proxy-enabled `fetch` so these utilities work behind a proxy. Connectivity to the Google Admin API can be verified with `node -e "require('undici'); fetch('https://admin.googleapis.com')"` which should return a 404 status.
Some helper functions surface API errors as exceptions. Tests may assert on these when verifying 4xx scenarios.
