"use client";

import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Button } from "../ui/button";
import { Copy, Eye, EyeOff, ShieldAlert } from "lucide-react";

interface PasswordDisplayProps {
  password: string;
  accountEmail: string;
}

export function PasswordDisplay({ password, accountEmail }: PasswordDisplayProps) {
  const [showPassword, setShowPassword] = useState(true);
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
      <ShieldAlert className="h-4 w-4" />
      <AlertTitle>Service Account Password Generated</AlertTitle>
      <AlertDescription>
        <div className="mt-3 space-y-3">
          <p className="text-sm">
            A password has been generated for <strong>{accountEmail}</strong>.
            Save this password securely - it will not be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded border bg-white dark:bg-zinc-900 px-3 py-2 font-mono text-sm">
              {showPassword ? password : "••••••••••••••••"}
            </code>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={copyToClipboard}
            >
              <Copy className="h-4 w-4" />
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}
