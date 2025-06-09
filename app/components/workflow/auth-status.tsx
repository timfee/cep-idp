"use client";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { AlertOctagonIcon, BadgeCheckIcon } from "lucide-react";
import Link from "next/link";

interface AuthStatusProps {
  provider: "google" | "microsoft";
  isAuthenticated: boolean;
  scopes: string[];
  requiredScopes: string[];
}

/**
 * Determines if a granted scope implies a required scope.
 * Handles common patterns: wildcard, readwrite > read/write, and exact match.
 * Extend this function for more complex provider-specific rules.
 */
function normalizeScope(scope: string): string {
  // Remove common Google prefix if present
  let s = scope.replace(/^https:\/\/www\.googleapis\.com\/auth\//, "");
  // Microsoft: normalize to lowercase and trim
  s = s.trim().toLowerCase();
  return s;
}

function scopeImplies(granted: string, required: string): boolean {
  const normGranted = normalizeScope(granted);
  const normRequired = normalizeScope(required);

  // Exact match
  if (normGranted === normRequired) return true;

  // Wildcard: e.g., 'admin.directory.*' implies 'admin.directory.user'
  if (normGranted.endsWith(".*")) {
    const prefix = normGranted.slice(0, -2);
    if (normRequired.startsWith(prefix)) return true;
  }

  // readwrite implies read or write (Google/Microsoft convention)
  if (normGranted.includes("readwrite")) {
    const base = normGranted.replace("readwrite", "");
    if (
      (normRequired.includes("read") || normRequired.includes("write")) &&
      normRequired.startsWith(base)
    ) {
      return true;
    }
  }

  // readwrite. -> read. or write. (for cases like 'foo.readwrite.bar')
  if (
    normGranted.match(/\.readwrite\./) &&
    normRequired.match(/\.(read|write)\./)
  ) {
    const base = normGranted.replace(".readwrite.", ".");
    if (normRequired.replace(/\.(read|write)\./, ".") === base) return true;
  }

  // Add more implication rules here as needed

  return false;
}

function hasAllRequiredScopes(
  grantedScopes: string[],
  requiredScopes: string[],
): boolean {
  return requiredScopes.every((required) =>
    grantedScopes.some((granted) => scopeImplies(granted, required)),
  );
}

export function AuthStatus({
  provider,
  isAuthenticated,
  scopes,
  requiredScopes,
}: AuthStatusProps) {
  const displayName = provider === "google" ? "Google" : "Microsoft";
  const hasAllScopes = hasAllRequiredScopes(scopes, requiredScopes);
  const missingScopes = requiredScopes.filter(
    (required) => !scopes.some((granted) => scopeImplies(granted, required)),
  );

  const authUrl = `/api/auth/${provider}`;

  const scopeMessage = hasAllScopes ? (
    "All required scopes granted"
  ) : (
    <>
      Missing some required scopes:{" "}
      <span className="font-mono">{missingScopes.join(", ")}</span>
    </>
  );

  let actionElement: React.ReactNode;
  if (!isAuthenticated) {
    actionElement = (
      <Button asChild>
        <Link href={authUrl}>Authenticate</Link>
      </Button>
    );
  } else if (!hasAllScopes) {
    actionElement = (
      <Button asChild color="amber">
        <Link href={authUrl}>Re-authenticate</Link>
      </Button>
    );
  } else {
    actionElement = <Badge color="green">Connected</Badge>;
  }

  return (
    <div className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center gap-3">
        {isAuthenticated ? (
          <Badge
            variant="secondary"
            className="bg-green-500 text-white dark:bg-blue-600"
          >
            <BadgeCheckIcon />
            All set
          </Badge>
        ) : (
          <Badge
            variant="secondary"
            className="bg-yellow-700 text-white dark:bg-blue-600"
          >
            <AlertOctagonIcon />
            Attention
          </Badge>
        )}
        <div>
          <h3 className="font-medium">{displayName}</h3>
          {isAuthenticated && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {scopeMessage}
            </p>
          )}
        </div>
      </div>

      {actionElement}
    </div>
  );
}
