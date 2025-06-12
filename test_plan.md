# Test Plan

To ensure fixtures capture both success and conflict variants, remove any existing test objects before running the workflow. The basic cleanup steps are:

1. **Domains**
   - `DELETE /customer/my_customer/domains/test-automation.feeley.xyz`
   - Then run `admin.postDomain` to capture the successful response (`postDomain_201.json`).
   - Re-run `admin.postDomain` without deleting to capture the 409 conflict (`postDomain.json`).

2. **Test User**
   - `DELETE /users/test-provisioning@feeley.xyz`
   - Execute `admin.postUser` for the 201 success and again to capture the 409 response.

3. **Admin Role**
   - `DELETE /customer/my_customer/roleassignments/{assignmentId}` if it exists.
   - `DELETE /customer/my_customer/roles/{roleId}` if it exists.
   - Create the role via `admin.postRole` and assign it with `admin.postRoleAssign`.

4. **Cloud Identity SSO Assignments**
   - `DELETE /inboundSamlSsoProfiles/{profileId}/assignments/{assignmentId}`
   - Use `ci.postSsoAssignment` to create the root OU assignment.

5. **Microsoft SSO Application**
   - `DELETE /applications/{appId}` and `DELETE /servicePrincipals/{servicePrincipalId}` if previously instantiated.
   - Run `graph.instantiateSSO` to capture the 201 success response.
   - Repeat the call without deleting to capture the error variant.

This process ensures that each fixture represents a real success scenario. The `test_execution_log.txt` file should document both the successful requests and any subsequent 409 conflict calls.
