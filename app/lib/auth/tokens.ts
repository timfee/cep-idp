import { cookies } from 'next/headers';
import { Token, WorkflowState } from '../workflow/types';
import { encrypt, decrypt } from './crypto';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

export async function getToken(provider: 'google' | 'microsoft'): Promise<Token | null> {
  const cookieName = `${provider}_token`;
  const cookie = (await cookies()).get(cookieName);

  if (!cookie) return null;

  try {
    const decrypted = decrypt(cookie.value);
    return JSON.parse(decrypted);
  } catch (error) {
    console.error(`Failed to decrypt ${provider} token:`, error);
    return null;
  }
}

export async function setToken(provider: 'google' | 'microsoft', token: Token): Promise<void> {
  const cookieName = `${provider}_token`;
  const encrypted = encrypt(JSON.stringify(token));

  (await cookies()).set(cookieName, encrypted, {
    ...COOKIE_OPTIONS,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });
}

export async function deleteToken(provider: 'google' | 'microsoft'): Promise<void> {
  const cookieName = `${provider}_token`;
  (await cookies()).delete(cookieName);
}

export async function getWorkflowState(): Promise<WorkflowState> {
  const stateCookie = (await cookies()).get('workflow_state');

  if (!stateCookie) {
    return {
      variables: {},
      stepStatus: {},
      tokens: {},
    };
  }

  try {
    const decrypted = decrypt(stateCookie.value);
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Failed to decrypt workflow state:', error);
    return {
      variables: {},
      stepStatus: {},
      tokens: {},
    };
  }
}

export async function setWorkflowState(state: WorkflowState): Promise<void> {
  const encrypted = encrypt(JSON.stringify(state));

  (await cookies()).set('workflow_state', encrypted, {
    ...COOKIE_OPTIONS,
    maxAge: 24 * 60 * 60, // 24 hours
  });
}

// OAuth state management for CSRF protection
export async function setOAuthState(state: string, provider: string): Promise<void> {
  const data = { state, provider, timestamp: Date.now() };
  const encrypted = encrypt(JSON.stringify(data));

  (await cookies()).set('oauth_state', encrypted, {
    ...COOKIE_OPTIONS,
    maxAge: 600, // 10 minutes
  });
}

export async function validateOAuthState(state: string, provider: string): Promise<boolean> {
  const cookie = (await cookies()).get('oauth_state');
  if (!cookie) return false;

  try {
    const decrypted = decrypt(cookie.value);
    const data = JSON.parse(decrypted);

    // Check state matches and not expired (10 min)
    return data.state === state &&
           data.provider === provider &&
           Date.now() - data.timestamp < 600000;
  } catch {
    return false;
  }
}
