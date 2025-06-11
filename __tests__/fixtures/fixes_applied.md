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
- **Issue**: Request returned `Length Required` and then 400 for invalid resource.
- **Fix**: Added explicit empty body to avoid 411 but Graph still reports invalid job ID; captured failure.

### graph.getSamlSettings
- **Issue**: Resource not found for service principal.
- **Fix**: Captured 404 response using beta endpoint.

### graph.patchSamlSettings
- **Issue**: Resource not found.
- **Fix**: Captured 404 response when attempting patch.

### graph.createPolicy
- **Issue**: Incorrect JSON payload structure.
- **Fix**: Updated payload to stringified definition but Graph still returned invalid value; captured failure.

### graph.linkPolicy
- **Issue**: Attempting to link policy without valid ID results in bad request.
- **Fix**: Captured 400 response.

### web.fetchMetadata
- **Issue**: Needed sample federation metadata for certificate extraction.
- **Fix**: Stored federation metadata XML as fixture.
