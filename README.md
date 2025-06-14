# CEP Identity Federation Automater (Next.js / RSC)

> Provision Google Workspace resources and configure SSO to Microsoft Entra ID
> in **minutes**, not days.

The project combines a type-safe **workflow engine**, a friendly React Server
Component UI, and helper APIs for Google & Microsoft. Administrators can run
the guided flow end-to-end with _zero_ CLI tooling and minimal privilege
requirements.

---

## 1. What’s Inside?

| Path                                        | Purpose                                                     |
| ------------------------------------------- | ----------------------------------------------------------- |
| `app/`                                      | Next.js 14 app-router code (RSC + Server Actions).          |
| `app/lib/workflow/`                         | Modular workflow engine – see                               |
| [`WORKFLOW_README.md`](WORKFLOW_README.md). |
| `app/lib/auth/`                             | OAuth 2.0 helpers, token encryption, cookie chunking.       |
| `app/lib/cookies/`                          | Generic chunked-cookie utilities shared by auth & workflow. |
| `__tests__/`                                | Jest integration + fixture data for both providers.         |

---

## 2. Getting Started

```bash
# 1. Install deps
pnpm install

# 2. Provide credentials
cp .env.local.example .env.local  # fill in Google + Microsoft secrets

# 3. Run in dev mode
pnpm dev
```

Open <http://localhost:3000> and follow the on-screen prompts.

---

## 3. Architecture Highlights

### 3.1 Modular Workflow

- **Typed building blocks** – Endpoint builders, Zod-validated connections, and
  per-step files keep the configuration type-safe and discoverable.
- **Live progress** – Each step declares `verify` actions so the app can detect
  pre-existing resources and mark them complete automatically.
- **Variables Store** – Engine-populated key/value cache (persisted in
  chunked cookies) keeps UI and server logic in sync.

### 3.2 Shared Constants

`app/lib/workflow/constants.ts` centralises time units, base URLs, template
IDs, etc. No more string drift across files.

### 3.3 Chunked Cookies

Tokens often exceed the 4-KB cookie limit. The utilities in
`app/lib/cookies/` transparently split / reassemble values so **no** call site
needs to worry about size.

### 3.4 React Server Components

The UI fetches data directly inside components via `server-only` imports – no
REST proxy endpoints or client bundles are required, yet hydration remains
minimal thanks to Server Actions.

---

## 4. Scripts

| Command          | Description                                                |
| ---------------- | ---------------------------------------------------------- |
| `pnpm dev`       | Start Next.js in development mode.                         |
| `pnpm lint`      | Run ESLint & prettier. Must be clean before pushing.       |
| `pnpm test`      | Execute Jest with automatic token acquisition (see below). |
| `pnpm typecheck` | Execute TypeScript compiler with `--noEmit`.               |

---

## 5. Testing with Real APIs

The Jest setup acquires fresh OAuth tokens at runtime using the supplied
service account and Azure App credentials – **no hard-coded secrets** in the
repo. Populate the following environment variables before running the suite:

```env
# Google
GOOGLE_SERVICE_ACCOUNT_KEY=<json key> # or use Workload Identity
GOOGLE_ADMIN_EMAIL=<super-admin email>

# Microsoft
MS_TENANT_ID=<tenant guid>
MS_CLIENT_ID=<app id>
MS_CLIENT_SECRET=<secret>
```

Artifacts created by the tests (users, SAML profiles, etc.) are torn down in
`jest.globalTeardown.ts`. Provide their identifiers (see template in the file)
when adding new scenarios.

---

## 6. Contributing

1. Create a feature branch off `main`.
2. Add or update tests in `__tests__/`.
3. Ensure `pnpm lint` & `pnpm test` pass.
4. Open a PR; the CI pipeline mirrors the local scripts and will block on
   failures.

---

## 7. FAQ

**Q:** Where should I put a new constant?  
**A:** If it’s cross-cutting, add it to `constants.ts`. Otherwise keep it local
to the module that needs it and export only when reuse is proven.

---

Happy automating 🚀
