// Public re-exports
export * as admin from "./admin";
export * as ci from "./ci";
export * as graph from "./graph";
export * as web from "./web";

// ---------------------------------------------------------------------------
// Registry – maps fully-qualified endpoint names to their handler functions.
// Consumers (e.g. step engine) can look up endpoints dynamically.
// ---------------------------------------------------------------------------

import {
  getDomain,
  listDomains,
  postDomain,
  listOUAutomation,
  listOrgUnits,
  getOU,
  postOU,
  getUser,
  postUser,
  updateUser,
  listRoles,
  postRole,
  listPrivileges,
  getRoleAssign,
  postRoleAssign,
} from "./admin";

import {
  listSamlProfiles,
  createSamlProfile,
  getIdpCreds,
  addIdpCert,
  listSsoAssignments,
  postSsoAssignment,
} from "./ci";

import {
  listAppTemplates,
  instantiateProv,
  instantiateSSO,
  appByTemplateProv,
  appByTemplateSSO,
  getSync,
  patchSync,
  startSyncJob,
  getSamlSettings,
  patchSamlSettings,
  listPolicies,
  createPolicy,
  linkPolicy,
} from "./graph";

import { fetchMetadata } from "./web";

export const endpointRegistry = {
  // Admin SDK
  "admin.getDomain": getDomain,
  "admin.listDomains": listDomains,
  "admin.postDomain": postDomain,
  "admin.listOUAutomation": listOUAutomation,
  "admin.listOrgUnits": listOrgUnits,
  "admin.getOU": getOU,
  "admin.postOU": postOU,
  "admin.getUser": getUser,
  "admin.postUser": postUser,
  "admin.updateUser": updateUser,
  "admin.listRoles": listRoles,
  "admin.postRole": postRole,
  "admin.listPrivileges": listPrivileges,
  "admin.getRoleAssign": getRoleAssign,
  "admin.postRoleAssign": postRoleAssign,

  // Cloud-Identity
  "ci.listSamlProfiles": listSamlProfiles,
  "ci.createSamlProfile": createSamlProfile,
  "ci.getIdpCreds": getIdpCreds,
  "ci.addIdpCert": addIdpCert,
  "ci.listSsoAssignments": listSsoAssignments,
  "ci.postSsoAssignment": postSsoAssignment,

  // Microsoft Graph
  "graph.listAppTemplates": listAppTemplates,
  "graph.instantiateProv": instantiateProv,
  "graph.instantiateSSO": instantiateSSO,
  "graph.appByTemplateProv": appByTemplateProv,
  "graph.appByTemplateSSO": appByTemplateSSO,
  "graph.getSync": getSync,
  "graph.patchSync": patchSync,
  "graph.startSyncJob": startSyncJob,
  "graph.getSamlSettings": getSamlSettings,
  "graph.patchSamlSettings": patchSamlSettings,
  "graph.listPolicies": listPolicies,
  "graph.createPolicy": createPolicy,
  "graph.linkPolicy": linkPolicy,

  // Public
  "web.fetchMetadata": fetchMetadata,
} as const;
