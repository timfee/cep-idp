import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { encrypt, decrypt } from './crypto'

export interface OAuthToken {
  access_token: string
  refresh_token?: string
  scope?: string
  token_type?: string
  expires_in?: number
  expires_at?: number
}

export function generateState(): string {
  return randomBytes(16).toString('hex')
}

const COOKIE_PREFIX = 'oauth_'

export function setTokenCookie(res: NextResponse, provider: string, token: OAuthToken) {
  const payload = encrypt(JSON.stringify(token))
  res.cookies.set(`${COOKIE_PREFIX}${provider}`, payload, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
  })
}

export function getTokenFromCookies(req: NextRequest, provider: string): OAuthToken | null {
  const value = req.cookies.get(`${COOKIE_PREFIX}${provider}`)?.value
  if (!value) return null
  try {
    return JSON.parse(decrypt(value)) as OAuthToken
  } catch {
    return null
  }
}

export function clearToken(res: NextResponse, provider: string) {
  res.cookies.delete(`${COOKIE_PREFIX}${provider}`)
}
