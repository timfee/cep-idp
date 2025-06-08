import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForToken, Provider } from '@/lib/auth/oauth'
import { setTokenCookie } from '@/lib/auth/tokens'

export async function GET(req: NextRequest, context: { params: Promise<unknown> }) {
  const params = (await context.params) as Record<string, string>
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const storedState = req.cookies.get('oauth_state')?.value
  if (!code || !state || state !== storedState) {
    return NextResponse.json({ error: 'Invalid state' }, { status: 400 })
  }
  const allParams = (params ?? {}) as Record<string, string>
  const token = await exchangeCodeForToken(allParams.provider as Provider, code)
  const res = NextResponse.redirect(process.env.NEXT_PUBLIC_BASE_URL || '/')
  setTokenCookie(res, allParams.provider, token)
  res.cookies.delete('oauth_state')
  return res
}
