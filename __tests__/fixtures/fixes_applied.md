# Workflow Fixes Applied

## Endpoint Fixes

### ci.listSamlProfiles
- **Issue**: Wrong path used `/customers/{customerId}/inboundSamlSsoProfiles` leading to 404
- **Fix**: Updated path to `/inboundSamlSsoProfiles` with query parameter `filter=customer=='customers/{customerId}'`
- **Test**: Successfully retrieved existing profiles

## Other
- Added fixture directories and captured sample responses
### admin.getOU
- **Issue**: Using `/customer/{customerId}/orgunits/{ouPath}` caused 404 when `ouPath` included a leading slash.
- **Fix**: Updated path to `/customer/{customerId}/orgunits/{split(ouPath,'/')[1]}` to strip the leading slash.
- **Test**: Successfully retrieved Automation OU details

### graph.appByTemplateProv
- **Issue**: Filtering applications by `applicationTemplateId` returned unfiltered results.
- **Fix**: Added `ConsistencyLevel: eventual` header and confirmed valid `provTemplateId` default value.
- **Test**: Successfully retrieved apps with template ID.

### graph.instantiateSSO
- **Issue**: Template ID `8ba3d1d8-7c8c-4d2d-b179-04d4a68fba02` not found.
- **Fix**: Logged failure fixture; workflow may require different approach.
- **Test**: Received 400 error from Graph API.
### graph.startSyncJob
- **Issue**: Request originally returned `Length Required` and then a 400 for an invalid job ID.
- **Fix**: Created a synchronization job using template `GoogV2OutDelta` and successfully started it, capturing the 204 response.

### graph.patchSync
- **Issue**: Call to update synchronization configuration returned 404.
- **Fix**: Provided proper secrets payload and captured 204 response.

### graph.getSync
- **Issue**: Initial attempts to retrieve synchronization status returned 404.
- **Fix**: After creating a sync job and configuring secrets, the GET request succeeds with job details.

### graph.getSamlSettings
- **Issue**: Resource not found for service principal.
- **Fix**: Configured SAML settings and captured a 200 response with relay state.

### graph.patchSamlSettings
- **Issue**: Resource not found.
- **Fix**: Successfully patched relayState and recorded 204 response.

### graph.createPolicy
- **Issue**: Incorrect JSON payload structure initially caused a 400 error.
- **Fix**: Corrected body format and captured a successful 201 response for policy creation.

### graph.linkPolicy
- **Issue**: Attempting to link policy without valid ID results in bad request.
- **Fix**: Linked policy to service principal and captured 204 response.

### web.fetchMetadata
- **Issue**: Needed sample federation metadata for certificate extraction.
- **Fix**: Stored federation metadata XML as fixture.
### graph.appByTemplateSSO
- **Issue**: Template ID mismatch led to empty results
- **Fix**: Updated workflow default to `8b1025e4-1dd2-430b-a150-2ef79cd700f5` and refreshed fixture
- **Test**: Query returns the SSO gallery application

### admin.post* fixtures
- **Issue**: Several admin endpoints were missing fixtures
- **Fix**: Captured responses for domain creation, user creation, password update, role creation, and role assignment

### ci.ssoAssignments
- **Issue**: Listing and creating assignments returned 400 errors
- **Fix**: Corrected query parameters and body to successfully list and create assignments

### Fixture formatting
- **Issue**: Some Microsoft fixtures stored raw HTTP responses rather than JSON.
- **Fix**: Converted createPolicy and instantiateSSO fixtures to clean JSON bodies.
