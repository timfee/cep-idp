import { NextResponse } from 'next/server';
import { generateAuthUrl, generateState } from '@/app/lib/auth/oauth';
import { setOAuthState } from '@/app/lib/auth/tokens';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const provider = url.pathname.split('/').pop() as 'google' | 'microsoft';

  if (provider !== 'google' && provider !== 'microsoft') {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
  }

  const state = generateState();
  await setOAuthState(state, provider);

  const authUrl = generateAuthUrl(provider, state);

  return NextResponse.redirect(authUrl);
}
