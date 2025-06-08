import { NextRequest, NextResponse } from 'next/server'
import { generateAuthUrl, Provider } from '@/lib/auth/oauth'
import { generateState } from '@/lib/auth/tokens'

export async function GET(
  req: NextRequest,
  context: { params: Promise<unknown> }
) {
  const params = (await context.params) as Record<string, string>
  const url = new URL(req.url)
  const scopes = url.searchParams.get('scopes')?.split(',') || []
  const state = generateState()
  const allParams = params ?? {}
  const redirect = generateAuthUrl(allParams.provider as Provider, scopes, state)
  const res = NextResponse.redirect(redirect)
  res.cookies.set('oauth_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600,
  })
  return res
}
