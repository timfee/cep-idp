
const providers = {
  google: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    scopes: ['openid', 'profile', 'email'],
  },
  azure: {
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    clientId: process.env.AZURE_CLIENT_ID!,
    clientSecret: process.env.AZURE_CLIENT_SECRET!,
    scopes: ['offline_access'],
  },
} as const

export type Provider = keyof typeof providers

export function generateAuthUrl(provider: Provider, scopes: string[], state: string) {
  const cfg = providers[provider]
  const url = new URL(cfg.authUrl)
  url.searchParams.set('client_id', cfg.clientId)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('redirect_uri', `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback/${provider}`)
  url.searchParams.set('scope', scopes.join(' '))
  url.searchParams.set('state', state)
  url.searchParams.set('access_type', 'offline')
  return url.toString()
}

export async function exchangeCodeForToken(provider: Provider, code: string) {
  const cfg = providers[provider]
  const res = await fetch(cfg.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback/${provider}`,
    }),
  })
  if (!res.ok) throw new Error(`Token exchange failed for ${provider}`)
  const data = await res.json()
  return {
    access_token: data.access_token as string,
    refresh_token: data.refresh_token as string | undefined,
    scope: data.scope as string,
    token_type: data.token_type as string,
    expires_in: Number(data.expires_in),
  }
}

export async function refreshToken(provider: Provider, refreshToken: string) {
  const cfg = providers[provider]
  const res = await fetch(cfg.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })
  if (!res.ok) throw new Error(`Token refresh failed for ${provider}`)
  const data = await res.json()
  return {
    access_token: data.access_token as string,
    refresh_token: data.refresh_token as string | undefined,
    scope: data.scope as string,
    token_type: data.token_type as string,
    expires_in: Number(data.expires_in),
  }
}

export function validateScopes(token: { scope?: string }, required: string[]): boolean {
  if (!token.scope) return false
  const have = new Set(token.scope.split(/\s+/))
  return required.every((s) => have.has(s))
}
