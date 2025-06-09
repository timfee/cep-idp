"use client";

import { useTransition } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { clearWorkflowState } from "@/app/actions/clear-state";
import { refreshWorkflowState } from "@/app/actions/workflow-state";
import { Trash2, RefreshCw, Bug } from "lucide-react";

export function DebugTools() {
  const [isPending, startTransition] = useTransition();

  const handleClearState = () => {
    startTransition(async () => {
      const result = await clearWorkflowState();
      if (result.success) {
        console.log("Workflow state cleared successfully");
      } else {
        console.error("Failed to clear workflow state:", result.error);
      }
    });
  };

  const handleRefreshState = () => {
    startTransition(async () => {
      await refreshWorkflowState();
      console.log("Workflow state refreshed");
    });
  };

  const handleShowLocalStorage = () => {
    console.log("Local storage contents:", localStorage);
    console.log("Session storage contents:", sessionStorage);
  };

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
            onClick={handleClearState}
            disabled={isPending}
            variant="outline"
            size="sm"
            className="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/20"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Clear State
          </Button>
          
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