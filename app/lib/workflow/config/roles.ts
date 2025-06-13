import { z } from "zod";

// Local imports


/**
 * Roles map a logical permission set used by the workflow to the concrete list
 * of OAuth scopes required when authenticating against the respective API.
 */
const RoleSchema = z.record(z.array(z.string()));

export const roles = {
  // Google Admin SDK scopes
  dirDomainRW: [
    "https://www.googleapis.com/auth/admin.directory.domain",
    "https://www.googleapis.com/auth/siteverification",
  ],
  dirOrgunitRW: [
    "https://www.googleapis.com/auth/admin.directory.orgunit",
  ],
  dirUserRW: [
    "https://www.googleapis.com/auth/admin.directory.user",
  ],
  dirRoleRW: [
    "https://www.googleapis.com/auth/admin.directory.rolemanagement",
  ],

  // Google Cloud-Identity scopes
  ciInboundSso: [
    "https://www.googleapis.com/auth/cloud-identity.inboundsso",
  ],

  // Microsoft Graph scopes (Application permissions)
  graphAppRW: ["Application.ReadWrite.All"],
  graphSyncRW: ["Synchronization.ReadWrite.All"],
  graphPolicyRW: ["Policy.ReadWrite.ApplicationConfiguration"],
  graphAppRole: ["AppRoleAssignment.ReadWrite.All"],
} as const satisfies z.infer<typeof RoleSchema>;

// Fail fast when someone edits the file incorrectly.
RoleSchema.parse(roles);
