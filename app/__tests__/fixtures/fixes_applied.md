# Workflow Fixes Applied

# Workflow Fixes Applied

## Endpoint Fixes

### ci.listSsoAssignments
- **Issue**: Listing SSO assignments without filtering always returned a top-level empty object ("{}"), making it impossible to detect existing assignments.
- **Fix**: Changed query parameter from `samlSsoProfile` to `parent` so assignments are correctly tied to the newly created `samlProfileId`.

### graph.getAppRoleAssign & graph.postAppRoleAssign
- **Issue**: Defined but unused endpoints for app role assignments; `principalId` was never populated.
- **Fix**: Removed both endpoints to declutter the workflow.

### Create Microsoft Apps
- **Issue**: Workflow used hardcoded template IDs which could drift, causing instantiation failures.
- **Fix**: Introduced `provTemplateName` & `ssoTemplateName` variables and a new `graph.listAppTemplates` endpoint to look up template IDs dynamically by displayName before instantiating apps.

### graph.createPolicy
- **Issue**: Policy `definition` was passed as an escaped JSON string, causing request errors.
- **Fix**: Updated payload so `definition` is a JSON object array, matching Graph API expectations.

### Configure Google SSO Assignment
- **Issue**: `ci.postSsoAssignment` used the wrong field name `samlSsoProfile`, not accepted by API.
- **Fix**: Renamed the property to `ssoProfile` to match the Cloud Identity API contract.
