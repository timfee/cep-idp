import { env } from "@/app/env";
import { OAuthConfig, Token, WORKFLOW_CONSTANTS } from "../workflow";
import { MS_IN_SECOND } from "../workflow/constants";

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

export function getOAuthConfig(provider: "google" | "microsoft"): OAuthConfig {
  return provider === "google" ? googleOAuthConfig : microsoftOAuthConfig;
}

export function generateAuthUrl(
  provider: "google" | "microsoft",
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
  if (provider === "google") {
    params.set("access_type", "offline");
    params.set("prompt", "consent");
  }

  return `${config.authorizationUrl}?${params.toString()}`;
}

export async function exchangeCodeForToken(
  provider: "google" | "microsoft",
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
    grant_type: "authorization_code",
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
  provider: "google" | "microsoft",
  refreshToken: string,
): Promise<Token> {
  const config = getOAuthConfig(provider);

  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
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

export function validateScopes(
  token: Token,
  requiredScopes: string[],
): boolean {
  return requiredScopes.every((scope) => token.scope.includes(scope));
}

export function isTokenExpired(token: Token): boolean {
  if (!token.expiresAt) return true; // Treat missing expiry as expired
  const bufferMs = WORKFLOW_CONSTANTS.TOKEN_REFRESH_BUFFER_MS;
  const expiryTime = token.expiresAt - bufferMs;
  const now = Date.now();
  console.log(
    `[Token Expiry] Token expires at: ${new Date(token.expiresAt).toISOString()}, Current time: ${new Date(
      now,
    ).toISOString()}, Is expired: ${now >= expiryTime}`,
  );
  return now >= expiryTime;
}

export {
  generateCodeChallenge,
  generateCodeVerifier,
  generateState,
} from "./crypto";
