# CEP Identity Federation – Workflow Architecture & Configuration

This document describes the **modular workflow layer** that powers CEP Identity
Federation.  The configuration is code-driven and fully type-checked so your
editor and CI pipeline catch mistakes early.

## 0. TL;DR for the Impatient

* _Everything is code._  Instead of a monolithic JSON file, the runtime model
    is produced from strongly-typed **configs** under
    `app/lib/workflow/`.
* **connections.ts** – registry of remote API hosts and how to sign requests.
* **endpoints/** – route templates grouped by provider (Admin SDK, Cloud-
    Identity, Graph…).  Each file exports a typed `EndpointBuilder` that
    enforces params.
* **constants.ts** – One place for shared literals (URLs, template IDs, time
    units, etc.).  No more string drift.
* **steps/** – Each workflow step lives in its own file; the directory is
    loaded dynamically so you can ship features incrementally.
* The public UI is built by reading the compiled `Workflow` object – no need
    to manually synchronise JSON and React.

---

## 1. Runtime Overview

```
┌────────────────────────┐      ┌──────────────────────────┐
│  Next.js / RSC pages   │◀────▶│  Workflow React hooks    │
└────────────┬───────────┘      └────────────┬─────────────┘
             │                               │
             ▼            executes           ▼
       ┌──────────────┐  actions/verify  ┌──────────────┐
       │  engine.ts   │──────────────────▶│ endpoints/* │
       └──────┬───────┘   uses           └──────────────┘
              │                           ▲
              │ inject vars              │ uses
              ▼                           │
       ┌──────────────┐  persists        │
       │ variables.ts │──────────────────┘
       └──────────────┘
```

The engine iterates over **Step** objects emitted by `steps/index.ts`.  A step
declares `verify` and `execute` action lists.  An action references an
endpoint builder (e.g. `admin.postUser`) and may expose _extractors_
(`extractors.ts`) that save data into the per-user **Variables Store**.

## 2. Key Modules

### 2.1 constants.ts

Canonical homes for:

* `TIME` – self-explanatory numeric units (rule-guarded magic numbers).
* `BASE_URLS` – four URLs used across the project; you no longer see raw
  strings elsewhere.
* `TEMPLATE_IDS` & `TEMPLATE_NAMES` – Microsoft application-template metadata.

### 2.2 config/connections.ts

All external hosts with a `getAuthHeader` callback.

```ts
export const connections = {
  googleAdmin: { base: BASE_URLS.GOOGLE_ADMIN, getAuthHeader: … },
  graphBeta:   { base: BASE_URLS.GRAPH_BETA,  getAuthHeader: … },
  …
} satisfies Record<string, ConnectionConfig>
```

The Zod schema (`ConnectionConfigSchema`) guarantees every entry has the right
shape at **module load time** – the app fails fast during CI if you forget a
field.

### 2.3 endpoints/

```
endpoints/
  admin/
    post-user.ts       // exports buildPostUser()
  graph/
    start-sync.ts
  index.ts             // central barrel re-export
```

Each file lives next to the official API docs so copy-pasting is trivial.  The
pattern:

```ts
export const buildPostUser = endpoint(
  {
    conn: 'googleAdmin',
    method: 'POST',
    path: API_PATHS.USERS_ROOT,
  },
  z.object({
    primaryEmail: z.string().email(),
    …
  }),
)
```

At compile time you get:

* Autocomplete for connection names & methods.
* Type-checked payload against the Zod schema.
* Required path params enforced (because `API_PATHS` uses `{param}` tokens).

### 2.4 steps/

Each step exports a plain object of type `WorkflowStep`.  The name is inferred
from the filename so duplicates cannot exist.  A trimmed example:

```ts
export default defineStep({
  name: STEP_NAMES.CREATE_SERVICE_ACCOUNT,
  role: 'dirUserRW',
  outputs: ['provisioningUserId', 'generatedPassword'],
  verify: [action('admin.getUser').checker('exists')],
  execute: [
    action('admin.postUser')
      .payload(({ primaryDomain }) => ({
        primaryEmail: email('azuread-provisioning', primaryDomain),
        …
      }))
      .extract({ provisioningUserId: '$.id' }),
  ],
})
```

The DX is far better than editing a huge JSON blob – linting and IntelliSense
catch most issues immediately.

## 3. Variables Store & Chunked Cookies

OAuth tokens and big variable payloads are too large for a single Set-Cookie
header.  The new **chunked cookie utilities** take care of splitting and
reassembly:

* `setChunkedCookie()` – server-side helper that writes N cookies.  Uses
  `buildChunkMetadata()` from `cookies/utils.ts` so metadata logic exists only
  once.
* `getChunkedCookie()` – reassembles on read.

`MAX_COOKIE_SIZE` lives in `WORKFLOW_CONSTANTS`; if browsers ever change their
rules we update one number.

## 4. Adding a New Feature

1. **Create an endpoint** file if the API call is new.
2. **Add a step** under `steps/` referencing that endpoint.
3. **Wire up any new variables** via `variables.ts` (validators & generators are
   optional but recommended).
4. If new OAuth scopes are required, update `roles.ts`.

That’s it – the UI rebuilds automatically.

## 5. Testing

Jest integration suites live under `__tests__/workflow`.  Fixture responses are
matched against the new endpoint builders so mocks are guaranteed to stay in
sync with real calls.

## 6. Migrating from workflow.json

Use `scripts/json-to-ts.mjs` to convert each block into its new home.

* connections     → config/connections.ts
* roles           → config/roles.ts
* variables       → config/variables.ts
* endpoints       → endpoints/* (file per call)
* steps           → steps/* (file per step)

The script leaves TODO comments anywhere manual tweaking is required.

---

Happy automating!  If something is unclear, `#identity-federation` on the
internal Slack is the fastest route to help.
