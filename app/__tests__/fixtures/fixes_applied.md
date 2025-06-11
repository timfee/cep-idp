# Workflow Fixes Applied

## Endpoint Fixes

### ci.listSsoAssignments
- **Issue**: Listing SSO assignments without filtering always returned a top-level empty object ("{}"), making it impossible to detect existing assignments.
- **Fix**: Added `qs.samlSsoProfile` to endpoint definition so assignments are filtered by the newly created `samlProfileId`.

### graph.getAppRoleAssign & graph.postAppRoleAssign
- **Issue**: These endpoints were defined but never used in any workflow step, and `principalId` was never populated.
- **Fix**: Removed the unused Graph app-role endpoints to declutter the workflow.
