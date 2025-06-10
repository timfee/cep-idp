"use client";

import { executeWorkflowStep } from "@/app/actions/workflow-execution";
import { cn } from "@/app/lib/utils";
import { LogEntry, Step, StepStatus } from "@/app/lib/workflow";
import { MIN_LOG_COUNT_FOR_PLURAL, STATUS_VALUES, VARIABLE_KEYS, STEP_NAMES } from "@/app/lib/workflow/constants";
import { substituteVariables } from "@/app/lib/workflow";
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
import { Alert, AlertDescription } from "../ui/alert";

const JSON_INDENT = 2;

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

  const handleExecute = (stepName: string) => {
    // Clear any previous local result
    setLocalExecutionResult({ status: null });

    startTransition(async () => {
      const result = await executeWorkflowStep(stepName);

      // Update local state with execution result
      if (result.status) {
        setLocalExecutionResult({
          status:
            result.status.status === STATUS_VALUES.FAILED
              ? "failed"
              : "completed",
          error: result.status.error,
          logs: result.status.logs,
        });
      }
    });
  };

  const statusIcon = (() => {
    switch (effectiveStatus.status) {
      case STATUS_VALUES.PENDING:
        return <Clock className="h-5 w-5 text-zinc-400" />;
      case STATUS_VALUES.RUNNING:
        return (
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
            <span className="text-sm text-blue-600">Executing...</span>
          </div>
        );
      case STATUS_VALUES.COMPLETED:
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case STATUS_VALUES.FAILED:
        return <XCircle className="h-5 w-5 text-red-500" />;
      case STATUS_VALUES.SKIPPED:
        return <CheckCircle className="h-5 w-5 text-zinc-400" />;
      default:
        return <Clock className="h-5 w-5 text-zinc-400" />;
    }
  })();

  const hasContent =
    effectiveStatus.error ||
    effectiveStatus.logs.length > 0 ||
    effectiveStatus.status === STATUS_VALUES.FAILED;

  // Force expand if there's an error
  const forceOpen =
    effectiveStatus.status === STATUS_VALUES.FAILED || effectiveStatus.error;

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
                  {(step.inputs?.length || step.outputs?.length) && (
                    <div className="mt-2 space-y-1">
                      {step.inputs && step.inputs.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-zinc-500">Needs:</span>
                          {step.inputs.map((input) => {
                            const rawValue = variables[input];
                            let display = input;
                            if (rawValue) {
                              const substituted = substituteVariables(
                                rawValue,
                                variables,
                              );
                              display = `${input}: ${substituted.substring(0, 20)}${substituted.length > 20 ? "..." : ""}`;
                            }

                            return (
                              <Badge
                                key={input}
                                variant={rawValue ? "secondary" : "outline"}
                                className={cn(
                                  "text-xs font-mono",
                                  rawValue
                                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
                                )}
                              >
                                {display}
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                      {step.outputs && step.outputs.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-zinc-500">Sets:</span>
                          {step.outputs.map((output) => (
                            <Badge
                              key={output}
                              variant="outline"
                              className="text-xs font-mono border-green-200 text-green-700 dark:border-green-800 dark:text-green-300"
                            >
                              {output}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
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
                  effectiveStatus.status === STATUS_VALUES.PENDING &&
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

                {effectiveStatus.status === STATUS_VALUES.FAILED && (
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

            {!isAuthValid && step.role && effectiveStatus.status === STATUS_VALUES.PENDING && (
              <Alert variant="destructive" className="mt-3">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Authentication required. Please re-authenticate with{' '}
                  {step.role.startsWith('graph') ? 'Microsoft' : 'Google'} to continue.
                </AlertDescription>
              </Alert>
            )}

            {(effectiveStatus.error || effectiveStatus.status === STATUS_VALUES.FAILED) && (
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

          {effectiveStatus.status === STATUS_VALUES.COMPLETED &&
            variables[VARIABLE_KEYS.GENERATED_PASSWORD] &&
            step.name === STEP_NAMES.CREATE_SERVICE_ACCOUNT && (
              <div className="mt-3">
                <PasswordDisplay
                  password={variables[VARIABLE_KEYS.GENERATED_PASSWORD]}
                  accountEmail={
                    variables.provisioningUserEmail ||
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
                  effectiveStatus.status === STATUS_VALUES.FAILED
                    ? "text-red-600 dark:text-red-400 font-medium"
                    : "text-zinc-500 dark:text-zinc-400",
                )}
              >
                {(() => {
                  if (
                    effectiveStatus.status === STATUS_VALUES.FAILED &&
                    effectiveStatus.error
                  ) {
                    return "View error details";
                  }
                  if (effectiveStatus.logs.length > 0) {
                    const count = effectiveStatus.logs.length;
                    return `View ${count} log${
                      count >= MIN_LOG_COUNT_FOR_PLURAL ? "s" : ""
                    }`;
                  }
                  return "View details";
                })()}
              </span>
            </AccordionTrigger>
          )}

          {hasContent && (
            <AccordionContent className="px-6 pb-6">
              {effectiveStatus.status === STATUS_VALUES.FAILED && (
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
                    {effectiveStatus.status === STATUS_VALUES.FAILED
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
                                          const text = `// ${fullUrl}\nexport default ${JSON.stringify(responseData, null, JSON_INDENT)};`;
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
                                            return `// ${fullUrl}\nexport default ${JSON.stringify(responseData, null, JSON_INDENT)};`;
                                        }
                                        return typeof log.data === "string"
                                          ? log.data
                                            : JSON.stringify(log.data, null, JSON_INDENT);
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
