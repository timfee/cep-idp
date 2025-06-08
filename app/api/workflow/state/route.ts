import { NextResponse } from 'next/server';
import { getWorkflowState, getToken } from '@/app/lib/auth/tokens';

export async function GET() {
  try {
    const state = await getWorkflowState();

    // Add token status (without exposing actual tokens)
    const googleToken = await getToken('google');
    const microsoftToken = await getToken('microsoft');

    if (googleToken) {
      state.tokens.google = {
        ...googleToken,
        accessToken: '[REDACTED]',
        refreshToken: '[REDACTED]',
      };
    }

    if (microsoftToken) {
      state.tokens.microsoft = {
        ...microsoftToken,
        accessToken: '[REDACTED]',
        refreshToken: '[REDACTED]',
      };
    }

    return NextResponse.json(state);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
