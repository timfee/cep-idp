# Workflow Configuration Guide

This document explains in detail how the **`workflow.json`** file drives the CEP Identity Federation application. The file is consumed at runtime to build the UI and orchestrate API calls for Google Workspace and Microsoft Entra ID. Every entry in the JSON follows a specific schema defined in `app/lib/workflow/types.ts` and is validated by `app/lib/workflow/parser.ts` when the application starts.

## 1. File Overview

A valid workflow file contains the following top‑level keys:

1. **`connections`** – remote API hosts and authorization tokens.
2. **`roles`** – mapping of friendly names to OAuth scopes.
3. **`endpoints`** – reusable API request definitions.
4. **`checkers`** – small expressions used to evaluate API responses.
5. **`variables`** – data referenced or produced by the workflow.
6. **`steps`** – ordered list of tasks executed by the engine.

The sections below describe the syntax of each block with examples drawn from the provided workflow file.

## 2. Connections

Connections define the base URL and authentication string for each API. Actions reference these connections by name so the engine knows which host and token to use when executing a request.

```json
"connections": {
  "googleAdmin": {
    "base": "https://admin.googleapis.com/admin/directory/v1",
    "auth": "Bearer {googleAccessToken}"
  },
  "graphGA": {
    "base": "https://graph.microsoft.com/v1.0",
    "auth": "Bearer {azureAccessToken}"
  }
}
```

The `{googleAccessToken}` and `{azureAccessToken}` placeholders are variables populated at runtime. See the [Variables](#4-variables) section for interpolation rules.

## 3. Roles

A role is a named set of OAuth scopes. Steps declare the role they require so the UI can warn the user if they lack adequate permissions.

```json
"roles": {
  "dirUserRW": ["https://www.googleapis.com/auth/admin.directory.user"],
  "graphSyncRW": ["Synchronization.ReadWrite.All"]
}
```

If the logged‑in user does not have the scopes associated with a role, the corresponding step is disabled until the user provides consent.

## 4. Endpoints

Endpoints are short identifiers for API requests. Each entry specifies:

- **`conn`** – which connection configuration to use
- **`method`** – HTTP verb (GET, POST, PATCH, PUT, DELETE)
- **`path`** – path template relative to the connection base URL
- **`qs`** (optional) – query string parameters
- **`headers`** (optional) – additional HTTP headers

```json
"endpoints": {
  "admin.postUser": {
    "conn": "googleAdmin",
    "method": "POST",
    "path": "/users"
  },
  "graph.startSyncJob": {
    "conn": "graphGA",
    "method": "POST",
    "path": "/servicePrincipals/{provServicePrincipalId}/synchronization/jobs/{jobId}/start"
  }
}
```

Paths may contain placeholders such as `{provServicePrincipalId}` which are replaced with variable values at runtime.

## 5. Checkers

Checkers are small boolean expressions evaluated against an API response body. They are referenced by name inside an action. The built‑in checkers are defined in `workflow.json`:

```json
"checkers": {
  "exists": "$ != null",
  "fieldTruthy": "$.{field} == true",
  "eq": "$ == '{value}'"
}
```

A checker can access fields of the JSON response using JsonPath syntax. Custom values may be injected via the `field`, `value`, or `jsonPath` properties of an action.

## 6. Variables

Variables store data shared between steps. Each variable may include:

- **`default`** – value used if nothing else sets it
- **`validator`** – regular expression a value must match
- **`generator`** – name of a helper function from `generators.ts`
- **`_comment`** – human readable note (ignored by the parser)

Example:

```json
"variables": {
  "customerId": {
    "validator": "^C[0-9a-f]{10,}$|^my_customer$",
    "default": "my_customer"
  },
  "primaryDomain": {
    "_comment": "Fetched from Google Admin API"
  }
}
```

Any string wrapped in `{}` within an endpoint definition or action payload will be replaced by the corresponding variable. The template engine also supports helper functions such as `email(user, domain)` or `generateDeterministicPassword(seed)`.

## 7. Steps

The heart of the workflow is the **steps** array. Each step represents a discrete task. A step may declare:

- **`name`** – descriptive label
- **`inputs`** – variables required before execution
- **`outputs`** – variables produced by this step
- **`actions`**, **`verify`**, **`execute`** – lists of actions to perform
- **`role`** – required permission set
- **`depends_on`** – other steps that must complete first
- **`manual`** – if true, the user marks completion manually

A step must define automation using either a single **`actions`** list or one or
both of **`verify`** and **`execute`**. Manual steps may omit actions entirely.
The workflow parser rejects steps that include both styles at once or, for
non-manual steps, omit automation completely.

### 7.1 Actions

An action references an endpoint and can optionally include a payload, extraction rules and checker settings. When the engine runs a step it performs all actions listed under `verify` first. If every checker passes, the step is considered complete. Otherwise the `execute` actions run to apply the necessary changes.

```json
{
  "name": "Create Service Account for Microsoft",
  "outputs": ["provisioningUserId", "generatedPassword"],
  "verify": [{ "use": "admin.getUser", "checker": "exists" }],
  "execute": [
    {
      "use": "admin.postUser",
      "payload": {
        "primaryEmail": "{email('azuread-provisioning', primaryDomain)}",
        "password": "{generateDeterministicPassword(primaryDomain)}"
      },
      "extract": {
        "provisioningUserId": "$.id",
        "generatedPassword": "{generateDeterministicPassword(primaryDomain)}"
      }
    }
  ],
  "role": "dirUserRW",
  "depends_on": ["Create Automation Organizational Unit"]
}
```

### 7.2 Manual Steps

Some workflow stages require human intervention. Mark a step with `"manual": true` when the administrator must complete a task outside the automation (for example assigning users to an app). The UI allows the user to acknowledge completion before moving on.

## 8. Template Expressions

Strings wrapped in `{}` are processed by the template engine in `template.ts`. Besides simple variable substitution, several helper functions are available:

- `email(user, domain)` – build an email address
- `url(base, path)` – concatenate URL pieces
- `concat(a, b, ...)` – join strings
- `format(template, value1, value2, ...)` – `%s` string formatter
- `generatePassword(length)` – random password
- `generateDeterministicPassword(seed)` – stable password derived from a seed
- `extractCertificateFromXml(xml)` – pull a certificate from federation metadata

Expressions can be nested anywhere a string is expected: endpoint paths, query parameters, payload fields or checker values.

## 9. Extending the Workflow

To introduce new automation logic:

1. Add or update endpoint definitions in the **`endpoints`** section.
2. Define any new variables along with defaults or validators.
3. Append a new object to the **`steps`** array describing your task. Include `verify` actions if the step can detect pre‑existing state.
4. Update the **`roles`** block if additional OAuth scopes are required.

The application reloads the workflow file on startup, so after editing `workflow.json` simply restart the dev server.

## 10. Conclusion

`workflow.json` is the single source of truth describing how CEP Identity Federation should proceed. By understanding the structure outlined above – connections, roles, endpoints, variables and ordered steps – administrators can customize or extend the onboarding flow to suit their environment.
