import { env } from "@/app/env";
import "server-only";
import { OAuthConfig, Provider, Token } from "../workflow";
import {
  MS_IN_SECOND,
  OAUTH_GRANT_TYPES,
  PROVIDERS,
} from "../workflow/constants";

export const googleOAuthConfig: OAuthConfig = {
  clientId: env.GOOGLE_CLIENT_ID,
  clientSecret: env.GOOGLE_CLIENT_SECRET,
  redirectUri: `/api/auth/callback/google`,
  authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUrl: "https://oauth2.googleapis.com/token",
  scopes: [
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/admin.directory.user",
    "https://www.googleapis.com/auth/admin.directory.orgunit",
    "https://www.googleapis.com/auth/admin.directory.domain",
    "https://www.googleapis.com/auth/admin.directory.rolemanagement",
    "https://www.googleapis.com/auth/cloud-identity.inboundsso",
    "https://www.googleapis.com/auth/siteverification",
    "https://www.googleapis.com/auth/admin.directory.rolemanagement",
  ],
};

export const microsoftOAuthConfig: OAuthConfig = {
  clientId: env.MICROSOFT_CLIENT_ID,
  clientSecret: env.MICROSOFT_CLIENT_SECRET,
  redirectUri: `/api/auth/callback/microsoft`,
  authorizationUrl:
    "https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize",
  tokenUrl: "https://login.microsoftonline.com/organizations/oauth2/v2.0/token",
  scopes: [
    "openid",
    "profile",
    "email",
    "offline_access",
    "User.Read",
    "Directory.Read.All",
    "Application.ReadWrite.All",
    "AppRoleAssignment.ReadWrite.All",
    "Policy.ReadWrite.ApplicationConfiguration",
    "offline_access",
  ],
};

export function getOAuthConfig(provider: Provider): OAuthConfig {
  return provider === PROVIDERS.GOOGLE
    ? googleOAuthConfig
    : microsoftOAuthConfig;
}

export function generateAuthUrl(
  provider: Provider,
  state: string,
  baseUrl: string,
): string {
  const config = getOAuthConfig(provider);
  const params = new URLSearchParams();

  const redirectUri = new URL(config.redirectUri, baseUrl).toString();

  params.set("client_id", config.clientId);
  params.set("redirect_uri", redirectUri.toString());
  params.set("response_type", "code");
  params.set("scope", config.scopes.join(" "));
  params.set("state", state);
  if (provider === PROVIDERS.GOOGLE) {
    params.set("access_type", "offline");
    params.set("prompt", "consent");
  }

  return `${config.authorizationUrl}?${params.toString()}`;
}

export async function exchangeCodeForToken(
  provider: Provider,
  code: string,
  baseUrl: string,
): Promise<Token> {
  const config = getOAuthConfig(provider);

  const redirectUri = new URL(config.redirectUri, baseUrl).toString();

  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    redirect_uri: redirectUri,
    grant_type: OAUTH_GRANT_TYPES.AUTHORIZATION_CODE,
  });

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * MS_IN_SECOND,
    scope: data.scope?.split(" ") || config.scopes,
  };
}

export async function refreshAccessToken(
  provider: Provider,
  refreshToken: string,
): Promise<Token> {
  const config = getOAuthConfig(provider);

  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
    grant_type: OAUTH_GRANT_TYPES.REFRESH_TOKEN,
  });

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresAt: Date.now() + data.expires_in * MS_IN_SECOND,
    scope: data.scope?.split(" ") || config.scopes,
  };
}
