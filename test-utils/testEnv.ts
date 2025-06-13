import { getGoogleAccessToken, getMicrosoftAccessToken } from "./tokenUtils";

async function deleteGoogleUser() {
  const email = process.env.GOOGLE_TEST_USER;
  const token = process.env.GOOGLE_ACCESS_TOKEN;
  if (!email || !token) return;
  await fetch(
    `https://admin.googleapis.com/admin/directory/v1/users/${encodeURIComponent(
      email
    )}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
  ).catch((err) => console.warn("deleteGoogleUser", err));
}

async function deleteGoogleOrgUnit() {
  const ou = process.env.GOOGLE_TEST_OU;
  const token = process.env.GOOGLE_ACCESS_TOKEN;
  if (!ou || !token) return;
  await fetch(
    `https://admin.googleapis.com/admin/directory/v1/customer/my_customer/orgunits/${encodeURIComponent(
      ou
    )}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
  ).catch((err) => console.warn("deleteGoogleOrgUnit", err));
}

async function deleteGoogleSsoAssignment() {
  const profile = process.env.GOOGLE_SSO_PROFILE_ID;
  const assignment = process.env.GOOGLE_SSO_ASSIGNMENT_ID;
  const token = process.env.GOOGLE_ACCESS_TOKEN;
  if (!profile || !assignment || !token) return;
  await fetch(
    `https://cloudidentity.googleapis.com/v1/inboundSamlSsoProfiles/${profile}/assignments/${assignment}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
  ).catch((err) => console.warn("deleteGoogleSsoAssignment", err));
}

async function deleteMicrosoftApp() {
  const appId = process.env.MS_TEST_APP_ID;
  const token = process.env.MICROSOFT_ACCESS_TOKEN;
  if (!appId || !token) return;
  await fetch(`https://graph.microsoft.com/v1.0/applications/${appId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  }).catch((err) => console.warn("deleteMicrosoftApp", err));
}

async function deleteMicrosoftServicePrincipal() {
  const spId = process.env.MS_TEST_SP_ID;
  const token = process.env.MICROSOFT_ACCESS_TOKEN;
  if (!spId || !token) return;
  await fetch(`https://graph.microsoft.com/v1.0/servicePrincipals/${spId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  }).catch((err) => console.warn("deleteMicrosoftServicePrincipal", err));
}

export async function setupTestEnvironment() {
  await Promise.all([getGoogleAccessToken(), getMicrosoftAccessToken()]);
}

export async function teardownTestEnvironment() {
  await Promise.all([
    deleteGoogleUser(),
    deleteGoogleOrgUnit(),
    deleteGoogleSsoAssignment(),
    deleteMicrosoftApp(),
    deleteMicrosoftServicePrincipal(),
  ]);
}
