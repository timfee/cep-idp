"use client";

import { executeWorkflowStep } from "@/app/actions/workflow-execution";
import { cn } from "@/app/lib/utils";
import { LogEntry, Step, StepStatus } from "@/app/lib/workflow";
import { PasswordDisplay } from "./password-display";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2,
  XCircle,
} from "lucide-react";
import { useState, useTransition } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card } from "../ui/card";

interface StepCardProps {
  step: Step;
  status: StepStatus;
  canExecute: boolean;
  isAuthValid: boolean;
  variables: Record<string, string>;
}

export function StepCard({
  step,
  status,
  canExecute,
  isAuthValid,
  variables,
}: StepCardProps) {
  const [isPending, startTransition] = useTransition();
  const [localExecutionResult, setLocalExecutionResult] = useState<{
    status: "failed" | "completed" | null;
    error?: string;
    logs?: LogEntry[];
  }>({ status: null });

  // Use local execution result if available, otherwise use prop status
  const effectiveStatus = localExecutionResult.status
    ? {
        ...status,
        status: localExecutionResult.status,
        error: localExecutionResult.error,
        logs: localExecutionResult.logs || status.logs,
      }
    : status;

  // Debug logging
  console.log(`[DEBUG] StepCard rendered for ${step.name}:`, {
    propStatus: status.status,
    localStatus: localExecutionResult.status,
    effectiveStatus: effectiveStatus.status,
    hasError: !!effectiveStatus.error,
    errorMessage: effectiveStatus.error,
    logsCount: effectiveStatus.logs?.length || 0,
    canExecute,
    isAuthValid,
  });

  const handleExecute = (stepName: string) => {
    // Clear any previous local result
    setLocalExecutionResult({ status: null });

    startTransition(async () => {
      const result = await executeWorkflowStep(stepName);

      // Update local state with execution result
      if (result.status) {
        setLocalExecutionResult({
          status: result.status.status as "failed" | "completed",
          error: result.status.error,
          logs: result.status.logs,
        });
      }
    });
  };

  const statusIcon = (() => {
    switch (effectiveStatus.status) {
      case "pending":
        return <Clock className="h-5 w-5 text-zinc-400" />;
      case "running":
        return (
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
            <span className="text-sm text-blue-600">Executing...</span>
          </div>
        );
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "failed":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "skipped":
        return <CheckCircle className="h-5 w-5 text-zinc-400" />;
      default:
        return <Clock className="h-5 w-5 text-zinc-400" />;
    }
  })();

  const hasContent =
    effectiveStatus.error ||
    effectiveStatus.logs.length > 0 ||
    effectiveStatus.status === "failed";

  // Force expand if there's an error
  const forceOpen =
    effectiveStatus.status === "failed" || effectiveStatus.error;

  return (
    <Card className="overflow-hidden">
      <Accordion
        type="single"
        collapsible
        defaultValue={forceOpen ? "item" : undefined}
      >
        <AccordionItem value="item" className="border-0">
          <div className="px-6 pt-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                {statusIcon}
                <div>
                  <h3 className="font-medium">{step.name}</h3>
                  {step.apiStatus && (
                    <Badge color="amber" className="mt-1">
                      {step.apiStatus}
                    </Badge>
                  )}
                  {step.depends_on && step.depends_on.length > 0 && (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                      Depends on: {step.depends_on.join(", ")}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!step.manual &&
                  effectiveStatus.status === "pending" &&
                  canExecute &&
                  isAuthValid && (
                    <Button
                      onClick={() => handleExecute(step.name)}
                      variant="default"
                      disabled={isPending}
                    >
                      {isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Execute"
                      )}
                    </Button>
                  )}

                {effectiveStatus.status === "failed" && (
                  <Button
                    onClick={() => handleExecute(step.name)}
                    variant="destructive"
                    disabled={isPending}
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Retry"
                    )}
                  </Button>
                )}
              </div>
            </div>

            {(effectiveStatus.error || effectiveStatus.status === "failed") && (
              <div className="mt-3 p-4 bg-red-100 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-800">
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  <div className="w-full">
                    <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">
                      ❌ STEP FAILED
                    </h4>
                    <div className="bg-red-50 dark:bg-red-950/50 p-3 rounded border border-red-200 dark:border-red-700">
                      <pre className="text-xs text-red-700 dark:text-red-300 whitespace-pre-wrap overflow-x-auto">
                        {effectiveStatus.error || "Step execution failed"}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {effectiveStatus.status === "completed" &&
            effectiveStatus.variables?.generatedPassword &&
            step.name === "Create Service Account for Microsoft" && (
              <div className="mt-3">
                <PasswordDisplay
                  password={effectiveStatus.variables.generatedPassword}
                  accountEmail={
                    effectiveStatus.variables.provisioningUserEmail ||
                    "azuread-provisioning@domain"
                  }
                />
              </div>
            )}

          {hasContent && (
            <AccordionTrigger className="px-6 pb-2 pt-2">
              <span
                className={cn(
                  "text-sm",
                  effectiveStatus.status === "failed"
                    ? "text-red-600 dark:text-red-400 font-medium"
                    : "text-zinc-500 dark:text-zinc-400",
                )}
              >
                {(() => {
                  if (
                    effectiveStatus.status === "failed" &&
                    effectiveStatus.error
                  ) {
                    return "View error details";
                  }
                  if (effectiveStatus.logs.length > 0) {
                    const count = effectiveStatus.logs.length;
                    return `View ${count} log${count > 1 ? "s" : ""}`;
                  }
                  return "View details";
                })()}
              </span>
            </AccordionTrigger>
          )}

          {hasContent && (
            <AccordionContent className="px-6 pb-6">
              {effectiveStatus.status === "failed" && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
                  <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                    ❌ Execution Failed
                  </h4>
                  {effectiveStatus.error && (
                    <p className="text-xs text-red-700 dark:text-red-300 font-mono bg-red-100 dark:bg-red-900/50 p-2 rounded">
                      {effectiveStatus.error}
                    </p>
                  )}
                </div>
              )}
              {effectiveStatus.logs.length > 0 && (
                <div className="space-y-1">
                  <h4 className="text-sm font-medium mb-2">
                    {effectiveStatus.status === "failed"
                      ? "Debug Logs"
                      : "Execution Logs"}
                  </h4>
                  <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-3 text-xs font-mono space-y-1 max-h-64 overflow-y-auto">
                    {effectiveStatus.logs.map((log: LogEntry, i: number) => (
                      <div
                        key={i}
                        className={cn(
                          "space-y-1",
                          log.level === "error" &&
                            "text-red-600 dark:text-red-400",
                          log.level === "warn" &&
                            "text-amber-600 dark:text-amber-400",
                        )}
                      >
                        {log.data &&
                        typeof log.data === "object" &&
                        "fullUrl" in log.data ? (
                          // API response log - show condensed format
                          <div className="space-y-1">
                            <details className="group">
                              <summary className="cursor-pointer flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-950/30 rounded-md border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50">
                                <span className="text-xs text-zinc-500 dark:text-zinc-600">
                                  {new Date(log.timestamp).toLocaleTimeString()}
                                </span>
                                <span className="text-xs font-mono text-blue-700 dark:text-blue-300">
                                  {log.message} ⬇︎
                                </span>
                              </summary>
                              <div className="mt-2 ml-4">
                                <div className="bg-slate-900 dark:bg-slate-950 rounded-md border border-slate-600 relative">
                                  <div className="flex items-center justify-between px-3 py-2 border-b border-slate-600 bg-slate-800 rounded-t-md">
                                    <span className="text-xs font-mono text-slate-400">
                                      API Response
                                    </span>
                                    <button
                                      onClick={() => {
                                        if (
                                          log.data &&
                                          typeof log.data === "object" &&
                                          "response" in log.data &&
                                          "fullUrl" in log.data
                                        ) {
                                          const responseData =
                                            log.data.response;
                                          const fullUrl = log.data.fullUrl;
                                          const text = `// ${fullUrl}\nexport default ${JSON.stringify(responseData, null, 2)};`;
                                          navigator.clipboard.writeText(text);
                                        }
                                      }}
                                      className="text-xs text-slate-400 hover:text-slate-200"
                                    >
                                      Copy
                                    </button>
                                  </div>
                                  <pre className="p-3 text-xs overflow-x-auto text-slate-100 font-mono leading-relaxed">
                                    <code>
                                      {(() => {
                                        if (
                                          log.data &&
                                          typeof log.data === "object" &&
                                          "response" in log.data &&
                                          "fullUrl" in log.data
                                        ) {
                                          const responseData =
                                            log.data.response;
                                          const fullUrl = log.data.fullUrl;
                                          return `// ${fullUrl}\nexport default ${JSON.stringify(responseData, null, 2)};`;
                                        }
                                        return typeof log.data === "string"
                                          ? log.data
                                          : JSON.stringify(log.data, null, 2);
                                      })()}
                                    </code>
                                  </pre>
                                </div>
                              </div>
                            </details>
                          </div>
                        ) : (
                          // Regular log - show normal format
                          <div className="flex gap-2">
                            <span className="text-zinc-500 dark:text-zinc-600">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                            <span>{log.message}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </AccordionContent>
          )}
        </AccordionItem>
      </Accordion>
    </Card>
  );
}
