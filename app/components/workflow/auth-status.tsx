'use client';

import { Badge } from '../badge';
import { Button } from '../button';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

interface AuthStatusProps {
  provider: 'google' | 'microsoft';
  isAuthenticated: boolean;
  scopes: string[];
  requiredScopes: string[];
  onAuthenticate: () => void;
}

export function AuthStatus({
  provider,
  isAuthenticated,
  scopes,
  requiredScopes,
  onAuthenticate,
}: AuthStatusProps) {
  const displayName = provider === 'google' ? 'Google Workspace' : 'Microsoft Azure';
  const hasAllScopes = requiredScopes.every(scope => scopes.includes(scope));

  return (
    <div className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center gap-3">
        {isAuthenticated ? (
          <CheckCircleIcon className="h-5 w-5 text-green-500" />
        ) : (
          <XCircleIcon className="h-5 w-5 text-red-500" />
        )}
        <div>
          <h3 className="font-medium">{displayName}</h3>
          {isAuthenticated && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {hasAllScopes ? 'All required scopes granted' : 'Missing some required scopes'}
            </p>
          )}
        </div>
      </div>
      
      {!isAuthenticated ? (
        <Button onClick={onAuthenticate}>
          Authenticate
        </Button>
      ) : !hasAllScopes ? (
        <Button onClick={onAuthenticate} color="amber">
          Re-authenticate
        </Button>
      ) : (
        <Badge color="green">Connected</Badge>
      )}
    </div>
  );
}
