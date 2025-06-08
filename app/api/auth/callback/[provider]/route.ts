import { NextResponse } from 'next/server';
import { exchangeCodeForToken } from '@/app/lib/auth/oauth';
import { setToken, validateOAuthState } from '@/app/lib/auth/tokens';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const provider = url.pathname.split('/').pop() as 'google' | 'microsoft';
  const searchParams = url.searchParams;

  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/?error=${error}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/?error=missing_params`
    );
  }

  // Validate state
  const isValidState = await validateOAuthState(state, provider);
  if (!isValidState) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/?error=invalid_state`
    );
  }

  try {
    const token = await exchangeCodeForToken(provider, code);
    await setToken(provider, token);

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/`);
  } catch (error) {
    console.error('Token exchange failed:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/?error=token_exchange_failed`
    );
  }
}
