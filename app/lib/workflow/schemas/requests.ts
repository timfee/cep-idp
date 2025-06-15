import { z } from "zod";

  name: z.object({ givenName: z.string(), familyName: z.string() }),
});


export const CreateOrgUnitBodySchema = z.object({
  name: z.string(),
  parentOrgUnitPath: z.string()
});

export type CreateOrgUnitBody = z.infer<typeof CreateOrgUnitBodySchema>;
export const CreateRoleBodySchema = z.object({
  roleName: z.string(),
  roleDescription: z.string().optional(),
  rolePrivileges: z.array(
    z.object({ privilegeName: z.string(), serviceId: z.string() })
  ),
});

export const RoleAssignmentBodySchema = z.object({
  roleId: z.string(),
  assignedTo: z.string(),
  assigneeType: z.enum(["user", "group"]).optional(),
  scopeType: z.enum(["CUSTOMER", "ORG_UNIT"]).optional(),
  orgUnitId: z.string().optional(),
});

export const UpdateUserBodySchema = z.object({
  primaryEmail: z.string().email().optional(),
  name: z
    .object({
      givenName: z.string().optional(),
      familyName: z.string().optional(),
    })
    .optional(),
  password: z.string().optional(),
  suspended: z.boolean().optional(),
  orgUnitPath: z.string().optional(),
});

// Google Cloud Identity Schemas
export const CreateSamlProfileBodySchema = z.object({
  displayName: z.string(),
  idpConfig: z.object({
    entityId: z.string(),
    singleSignOnServiceUri: z.string(),
  }),
});

export const AddIdpCertBodySchema = z.object({ pemData: z.string() });

export const PostSsoAssignmentBodySchema = z.object({
  targetGroup: z.object({ id: z.string() }).optional(),
  targetOrgUnit: z.string().optional(),
  samlSsoInfo: z.object({ inboundSamlSsoProfile: z.string() }),
  ssoMode: z.enum(["SSO_OFF", "SAML_SSO", "DOMAIN_WIDE_SAML_IF_ENABLED"]),
});

export const CreatePolicyBodySchema = z.object({
  definition: z.array(z.string()),
  displayName: z.string(),
  isOrganizationDefault: z.boolean().default(false),
});

export const LinkPolicyBodySchema = z.object({ "@odata.id": z.string() });

export const PatchSamlSettingsBodySchema = z.object({
  relayState: z.string().optional(),
});

export const PatchSyncBodySchema = z.object({
  secrets: z.array(z.object({ key: z.string(), value: z.string() })).optional(),
  credentials: z
    .array(z.object({ key: z.string(), value: z.string() }))
    .optional(),
});

export type CreateOrgUnitBody = z.infer<typeof CreateOrgUnitBodySchema>;
export type CreateRoleBody = z.infer<typeof CreateRoleBodySchema>;
export type RoleAssignmentBody = z.infer<typeof RoleAssignmentBodySchema>;
export type UpdateUserBody = z.infer<typeof UpdateUserBodySchema>;
export type CreateSamlProfileBody = z.infer<typeof CreateSamlProfileBodySchema>;
export type AddIdpCertBody = z.infer<typeof AddIdpCertBodySchema>;
export type PostSsoAssignmentBody = z.infer<typeof PostSsoAssignmentBodySchema>;
export type CreatePolicyBody = z.infer<typeof CreatePolicyBodySchema>;
export type LinkPolicyBody = z.infer<typeof LinkPolicyBodySchema>;
export type PatchSamlSettingsBody = z.infer<typeof PatchSamlSettingsBodySchema>;
export type PatchSyncBody = z.infer<typeof PatchSyncBodySchema>;

export const CreateUserBodySchema = z.object({
  primaryEmail: z.string().email(),
  name: z.object({ givenName: z.string(), familyName: z.string() }),
  password: z.string(),
  orgUnitPath: z.string().optional(),
});

export type CreateUserBody = z.infer<typeof CreateUserBodySchema>;
