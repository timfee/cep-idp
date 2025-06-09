"use client";

import { refreshWorkflowState } from "@/app/actions/workflow-state";
import { Bug, RefreshCw } from "lucide-react";
import { useTransition } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

export function DebugTools() {
  const [isPending, startTransition] = useTransition();

  const handleRefreshState = () => {
    startTransition(async () => {
      await refreshWorkflowState();
    });
  };

  const handleShowLocalStorage = () => {};

  // Always show debug tools for now

  return (
    <Card className="border-dashed border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
          <Bug className="h-4 w-4" />
          Debug Tools
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleRefreshState}
            disabled={isPending}
            variant="outline"
            size="sm"
            className="border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950/20"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </Button>

          <Button
            onClick={handleShowLocalStorage}
            variant="outline"
            size="sm"
            className="border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Log Storage
          </Button>
        </div>

        <p className="text-xs text-amber-700 dark:text-amber-300">
          Development tools - not visible in production
        </p>
      </CardContent>
    </Card>
  );
}
