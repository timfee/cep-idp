"use client";
import "client-only";

import { PROVIDERS, TIME } from "@/app/lib/workflow/constants";
import { AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, AlertDescription } from "../ui/alert";
import { Button } from "../ui/button";

interface TokenStatusProps {
  provider: (typeof PROVIDERS)[keyof typeof PROVIDERS];
  isAuthenticated: boolean;
  expiresAt?: number;
  hasRefreshToken?: boolean;
  onRefresh?: () => Promise<void>;
}

export function TokenStatus({
  provider,
  isAuthenticated,
  expiresAt,
  hasRefreshToken,
  onRefresh,
}: TokenStatusProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();

  const MS_IN_MINUTE = TIME.MS_IN_MINUTE;
  const EXPIRING_SOON_MINUTES = TIME.TOKEN_EXPIRING_SOON_MINUTES;
  const MINUTES_IN_HOUR = TIME.MINUTES_IN_HOUR;

  if (!isAuthenticated) return null;

  const now = Date.now();
  const isExpired = expiresAt ? now >= expiresAt : false;
  const expiresIn = expiresAt ? expiresAt - now : 0;
  const expiresInMinutes = Math.floor(expiresIn / MS_IN_MINUTE);
  const isExpiringSoon =
    expiresInMinutes < EXPIRING_SOON_MINUTES && expiresInMinutes > 0;

  const handleRefresh = async () => {
    if (!onRefresh) return;

    setIsRefreshing(true);
    try {
      await onRefresh();
      router.refresh();
    } catch (error) {
      console.error("Token refresh failed:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatExpiry = () => {
    if (expiresInMinutes > MINUTES_IN_HOUR) {
      const hours = Math.floor(expiresInMinutes / MINUTES_IN_HOUR);
      return `${hours} hour${hours > 1 ? "s" : ""}`;
    }
    return `${expiresInMinutes} minute${expiresInMinutes !== 1 ? "s" : ""}`;
  };

  if (isExpired) {
    return (
      <Alert variant="destructive" className="mb-2">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>Token expired - re-authentication required</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => (window.location.href = `/api/auth/${provider}`)}
          >
            Re-authenticate
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (isExpiringSoon) {
    return (
      <div className="flex items-center justify-between text-sm text-amber-600 dark:text-amber-400 mb-2">
        <span>Token expires in {formatExpiry()}</span>
        {hasRefreshToken && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`h-3 w-3 mr-1 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 mb-2">
      <CheckCircle className="h-3 w-3" />
      <span>Token valid for {formatExpiry()}</span>
    </div>
  );
}
