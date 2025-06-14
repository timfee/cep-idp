# AGENTS

- Run tests with `pnpm test`. Required environment variables are listed in `README.md`.
- `jest.setup.ts`, `jest.globalSetup.ts` and `jest.globalTeardown.ts` install an `undici.ProxyAgent` so `fetch` respects `HTTPS_PROXY`.
- If a test fails with network errors, check that `HTTPS_PROXY` is set and that the `undici` dependency is installed.
- Connectivity to `admin.googleapis.com` and other APIs is available once the proxy agent is active. A quick `node -e "require('undici'); fetch('https://admin.googleapis.com')"` should return a 404 status.
- Live API endpoints may respond with 4xx errors if parameters do not match the Google Admin documentation. Review the endpoint helpers when this occurs.
- Some tests intentionally provoke 4xx responses (e.g. invalid parameters) and assert that the request fails. A 4xx status may therefore indicate the test passed.
