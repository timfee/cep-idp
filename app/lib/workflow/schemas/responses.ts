import { z } from "zod";

/*
 * Typed response schemas for external API calls used by the workflow engine.
 *
 * Schemas are intentionally minimal – only fields that are referenced by the
 * workflow step-handlers are marked as required.  All other properties are
 * permitted but ignored through the use of `.passthrough()`.  This allows the
 * engine to maintain type-safety for critical fields while remaining resilient
 * to upstream API changes.
 *
 * NOTE:  Some Google fixtures include an internal `_metadata` object that is
 * added by the test harness – that object is **not** present in real API
 * responses.  Since `zod` defaults to allowing unknown keys we do not need to
 * model it explicitly; it will simply be ignored.
 */

/* -------------------------------------------------------------------------- */
/* Google Admin Directory                                                         */
/* -------------------------------------------------------------------------- */

export const DomainSchema = z
  .object({
    domainName: z.string(),
    isPrimary: z.boolean(),
    verified: z.boolean(),
    creationTime: z.string().optional(),
    etag: z.string().optional(),
    kind: z.string().optional()
  })
  .passthrough()
  .describe("Google Admin Directory domain metadata");

export const ListDomainsResponseSchema = z
  .object({
    domains: z.array(DomainSchema).optional(),
    kind: z.string().optional(),
    etag: z.string().optional()
  })
  .passthrough()
  .describe("Response wrapper for Admin SDK listDomains endpoint");

export const OrgUnitSchema = z
  .object({
    name: z.string(),
    orgUnitPath: z.string(),
    orgUnitId: z.string().optional(),
    parentOrgUnitPath: z.string().optional(),
    parentOrgUnitId: z.string().optional()
  })
  .passthrough()
  .describe("Google Admin Directory organizational unit metadata");

export const ListOrgUnitsResponseSchema = z
  .object({
    organizationUnits: z.array(OrgUnitSchema).optional(),
    kind: z.string().optional()
  })
  .passthrough()
  .describe("Response wrapper for Admin SDK listOrgUnits endpoint");

export const ListOuAutomationResponseSchema = ListOrgUnitsResponseSchema;

export type ListOuAutomationResponse = z.infer<
  typeof ListOuAutomationResponseSchema
>;

export const UserSchema = z
  .object({
    id: z.string(),
    primaryEmail: z.string(),
    name: z
      .object({
        givenName: z.string().optional(),
        familyName: z.string().optional(),
        fullName: z.string().optional()
      })
      .optional(),
    isAdmin: z.boolean().optional(),
    orgUnitPath: z.string().optional()
  })
  .passthrough()
  .describe("Minimal subset of Google Admin user record used by workflow");

export const PrivilegeSchema = z
  .object({
    privilegeName: z.string(),
    serviceId: z.string(),
    // The workflow only inspects privilegeName/serviceId.  Nested privileges
    // are left untyped to avoid circular-reference complexity.
    childPrivileges: z.array(z.unknown()).optional()
  })
  .passthrough()
  .describe("Google Admin privilege definition including nested children");

export const ListPrivilegesResponseSchema = z
  .object({
    items: z.array(PrivilegeSchema).optional(),
    kind: z.string().optional()
  })
  .passthrough()
  .describe("Response wrapper for Admin SDK listPrivileges endpoint");

export const RolePrivilegeSchema = z
  .object({ privilegeName: z.string(), serviceId: z.string() })
  .passthrough()
  .describe("Role privilege mapping (name + serviceId)");

export const RoleSchema = z
  .object({
    roleId: z.string(),
    roleName: z.string(),
    roleDescription: z.string().optional(),
    rolePrivileges: z.array(RolePrivilegeSchema).optional(),
    isSystemRole: z.boolean().optional()
  })
  .passthrough()
  .describe("Google Admin role definition");

export const ListRolesResponseSchema = z
  .object({
    items: z.array(RoleSchema).optional(),
    kind: z.string().optional()
  })
  .passthrough()
  .describe("Response wrapper for Admin SDK listRoles endpoint");

export const RoleAssignmentSchema = z
  .object({
    roleAssignmentId: z.string(),
    roleId: z.string(),
    assignedTo: z.string(),
    assigneeType: z.string().optional(),
    scopeType: z.string().optional()
  })
  .passthrough()
  .describe("Mapping of role to user/group (role assignment record)");

export const ListRoleAssignmentsResponseSchema = z
  .object({
    items: z.array(RoleAssignmentSchema).optional(),
    kind: z.string().optional()
  })
  .passthrough()
  .describe("Response wrapper for Admin SDK listRoleAssignments endpoint");

/* -------------------------------------------------------------------------- */
/* Google Cloud Identity                                                         */
/* -------------------------------------------------------------------------- */

export const SsoIdpConfigSchema = z
  .object({
    entityId: z.string().optional(),
    singleSignOnServiceUri: z.string().optional()
  })
  .passthrough()
  .describe("Inbound SAML IdP configuration block");

export const SsoSpConfigSchema = z
  .object({
    // The fixture sometimes calls this `entityId`; the step-handler expects
    // `spEntityId`.  We'll allow both for maximum compatibility.
    entityId: z.string().optional(),
    spEntityId: z.string().optional(),
    assertionConsumerServiceUri: z.string().optional()
  })
  .passthrough()
  .describe("Inbound SAML SP configuration block");

export const InboundSamlSsoProfileSchema = z
  .object({
    name: z.string(),
    customer: z.string().optional(),
    displayName: z.string().optional(),
    idpConfig: SsoIdpConfigSchema.optional(),
    spConfig: SsoSpConfigSchema.optional()
  })
  .passthrough()
  .describe("Cloud Identity inbound SAML profile");

export const ListSamlProfilesResponseSchema = z
  .object({
    inboundSamlSsoProfiles: z.array(InboundSamlSsoProfileSchema).optional()
  })
  .passthrough()
  .describe("Response for list inbound SAML profiles");

// Long-running operation wrapper used by createSamlProfile / postSsoAssignment
export const OperationResponseSchema = z
  .object({
    done: z.boolean().optional(),
    name: z.string().optional(),
    response: z.unknown().optional(),
    error: z
      .object({ code: z.number(), message: z.string(), status: z.string() })
      .optional()
  })
  .passthrough()
  .describe("Long-running operation wrapper used by CI APIs");

export const InboundSsoAssignmentSchema = z
  .object({
    name: z.string(),
    customer: z.string().optional(),
    targetGroup: z.object({ id: z.string() }).optional(),
    targetOrgUnit: z.string().optional(),
    ssoMode: z.string().optional(),
    samlSsoInfo: z
      .object({ inboundSamlSsoProfile: z.string().optional() })
      .optional()
  })
  .passthrough()
  .describe("Cloud Identity inbound SSO assignment");

export const ListSsoAssignmentsResponseSchema = z
  .object({
    inboundSsoAssignments: z.array(InboundSsoAssignmentSchema).optional()
  })
  .passthrough()
  .describe("Response for list inbound SSO assignments");

/* -------------------------------------------------------------------------- */
/* Microsoft Graph                                                               */
/* -------------------------------------------------------------------------- */

/* Utility schemas */
export const NullableString = z.string().nullable().optional();

/* Application list (GET /applications?filter=...) */
export const ApplicationListItemSchema = z
  .object({
    id: z.string(),
    // `servicePrincipalId` is present only in the expanded template endpoint – make optional.
    servicePrincipalId: z.string().optional(),
    appId: z.string().optional(),
    applicationTemplateId: z.string().optional(),
    displayName: z.string().optional()
  })
  .passthrough()
  .describe("Compact application record from Microsoft Graph");

export const ListApplicationsResponseSchema = z
  .object({
    value: z.array(ApplicationListItemSchema).optional(),
    "@odata.context": z.string().optional()
  })
  .passthrough()
  .describe("Response for list applications Graph endpoint");

/* instantiate{Prov,SSO} – returns an application/servicePrincipal pair */
export const ApplicationSchema = z
  .object({
    id: z.string(),
    appId: z.string(),
    displayName: z.string().optional()
  })
  .passthrough()
  .describe("Full Microsoft Graph Application object subset");

export const ServicePrincipalSchema = z
  .object({
    id: z.string(),
    appId: z.string(),
    displayName: z.string().optional()
  })
  .passthrough()
  .describe("Full Microsoft Graph ServicePrincipal subset");

export const InstantiateAppResponseSchema = z
  .object({
    application: ApplicationSchema,
    servicePrincipal: ServicePrincipalSchema,
    "@odata.context": z.string().optional()
  })
  .passthrough()
  .describe("Response from instantiateTemplate endpoint");

/* list/patch/get Sync & SAML settings – minimal fields */
export const GraphSyncResponseSchema = z
  .object({ jobs: z.array(z.unknown()).optional() })
  .passthrough()
  .describe("Response payload for /synchronization/syncJobs");

export const GraphNoContentResponseSchema = z
  .object({ status: z.number().int().optional() })
  .passthrough()
  .describe("Synthetic schema representing 204 responses");

/* Policies */
export const ClaimsPolicySchema = z
  .object({ id: z.string(), displayName: z.string().optional() })
  .passthrough()
  .describe("ClaimsMappingPolicy subset");

export const ListPoliciesResponseSchema = z
  .object({
    value: z.array(ClaimsPolicySchema).optional(),
    "@odata.context": z.string().optional()
  })
  .passthrough()
  .describe("Response for list claims mapping policies");

export const CreatePolicyResponseSchema = ClaimsPolicySchema.extend({
  definition: z.array(z.string()).optional(),
  isOrganizationDefault: z.boolean().optional(),
  "@odata.context": z.string().optional()
})
  .passthrough()
  .describe("Response after creating a claims mapping policy");

export const SamlSettingsResponseSchema = z
  .object({
    relayState: z.string().optional(),
    "@odata.context": z.string().optional()
  })
  .passthrough()
  .describe("Service principal SAML settings response");

/* -------------------------------------------------------------------------- */
/* Convenience re-exports for endpoints                                         */
/* -------------------------------------------------------------------------- */

export type Domain = z.infer<typeof DomainSchema>;
export type ListDomainsResponse = z.infer<typeof ListDomainsResponseSchema>;

export type OrgUnit = z.infer<typeof OrgUnitSchema>;
export type ListOrgUnitsResponse = z.infer<typeof ListOrgUnitsResponseSchema>;

export type User = z.infer<typeof UserSchema>;

export type Privilege = z.infer<typeof PrivilegeSchema>;
export type ListPrivilegesResponse = z.infer<
  typeof ListPrivilegesResponseSchema
>;

export type Role = z.infer<typeof RoleSchema>;
export type ListRolesResponse = z.infer<typeof ListRolesResponseSchema>;

export type RoleAssignment = z.infer<typeof RoleAssignmentSchema>;
export type ListRoleAssignmentsResponse = z.infer<
  typeof ListRoleAssignmentsResponseSchema
>;

export type InboundSamlSsoProfile = z.infer<typeof InboundSamlSsoProfileSchema>;
export type ListSamlProfilesResponse = z.infer<
  typeof ListSamlProfilesResponseSchema
>;

export type InboundSsoAssignment = z.infer<typeof InboundSsoAssignmentSchema>;
export type ListSsoAssignmentsResponse = z.infer<
  typeof ListSsoAssignmentsResponseSchema
>;

export type ApplicationListItem = z.infer<typeof ApplicationListItemSchema>;
export type ListApplicationsResponse = z.infer<
  typeof ListApplicationsResponseSchema
>;

export type InstantiateAppResponse = z.infer<
  typeof InstantiateAppResponseSchema
>;

export type ListPoliciesResponse = z.infer<typeof ListPoliciesResponseSchema>;
export type CreatePolicyResponse = z.infer<typeof CreatePolicyResponseSchema>;

export type SamlSettingsResponse = z.infer<typeof SamlSettingsResponseSchema>;
