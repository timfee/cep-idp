import { OAuthConfig, Token } from '../workflow/types';

export const googleOAuthConfig: OAuthConfig = {
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  redirectUri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback/google`,
  authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  scopes: [
    'https://www.googleapis.com/auth/admin.directory.domain',
    'https://www.googleapis.com/auth/siteverification',
    'https://www.googleapis.com/auth/admin.directory.orgunit',
    'https://www.googleapis.com/auth/admin.directory.user',
    'https://www.googleapis.com/auth/admin.directory.rolemanagement',
    'https://www.googleapis.com/auth/cloud-identity.inboundsso',
  ],
};

export const microsoftOAuthConfig: OAuthConfig = {
  clientId: process.env.AZURE_CLIENT_ID!,
  clientSecret: process.env.AZURE_CLIENT_SECRET!,
  redirectUri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback/microsoft`,
  authorizationUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
  tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
  scopes: [
    'Application.ReadWrite.All',
    'Synchronization.ReadWrite.All',
    'Policy.ReadWrite.ApplicationConfiguration',
    'AppRoleAssignment.ReadWrite.All',
    'offline_access',
  ],
};

export function getOAuthConfig(provider: 'google' | 'microsoft'): OAuthConfig {
  return provider === 'google' ? googleOAuthConfig : microsoftOAuthConfig;
}

export function generateAuthUrl(provider: 'google' | 'microsoft', state: string): string {
  const config = getOAuthConfig(provider);
  const params = new URLSearchParams();
  params.set('client_id', config.clientId);
  params.set('redirect_uri', config.redirectUri);
  params.set('response_type', 'code');
  params.set('scope', config.scopes.join(' '));
  params.set('state', state);
  if (provider === 'google') {
    params.set('access_type', 'offline');
    params.set('prompt', 'consent');
  }

  return `${config.authorizationUrl}?${params.toString()}`;
}

export async function exchangeCodeForToken(
  provider: 'google' | 'microsoft',
  code: string
): Promise<Token> {
  const config = getOAuthConfig(provider);

  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    redirect_uri: config.redirectUri,
    grant_type: 'authorization_code',
  });

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
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
    expiresAt: Date.now() + (data.expires_in * 1000),
    scope: data.scope?.split(' ') || config.scopes,
  };
}

export async function refreshAccessToken(
  provider: 'google' | 'microsoft',
  refreshToken: string
): Promise<Token> {
  const config = getOAuthConfig(provider);

  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
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
    expiresAt: Date.now() + (data.expires_in * 1000),
    scope: data.scope?.split(' ') || config.scopes,
  };
}

export function validateScopes(token: Token, requiredScopes: string[]): boolean {
  return requiredScopes.every(scope => token.scope.includes(scope));
}

export function isTokenExpired(token: Token): boolean {
  return Date.now() >= token.expiresAt - 300000; // 5 minute buffer
}

export { generateState, generateCodeVerifier, generateCodeChallenge } from './crypto';
