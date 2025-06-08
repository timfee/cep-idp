"use client";

import { Step, StepStatus } from "@/app/lib/workflow/types";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";

interface StepCardProps {
  step: Step;
  status: StepStatus;
  canExecute: boolean;
  isAuthValid: boolean;
  onExecute: () => void;
  onSkip: () => void;
}

export function StepCard({
  step,
  status,
  canExecute,
  isAuthValid,
  onExecute,
  onSkip,
}: StepCardProps) {
  const statusIcon = {
    pending: <Clock className="h-5 w-5 text-zinc-400" />,
    running: <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />,
    completed: <CheckCircle className="h-5 w-5 text-green-500" />,
    failed: <XCircle className="h-5 w-5 text-red-500" />,
    skipped: <CheckCircle className="h-5 w-5 text-zinc-400" />,
  }[status.status];

  const hasContent = status.error || status.logs.length > 0;
  const defaultOpen = status.status === "failed" || status.status === "running";

  return (
    <Card className="overflow-hidden">
      <Accordion
        type="single"
        collapsible
        defaultValue={defaultOpen ? "item" : undefined}
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
                {status.status === "pending" && canExecute && isAuthValid && (
                  <>
                    <Button onClick={onExecute} variant="default">
                      Execute
                    </Button>
                    <Button onClick={onSkip} variant="link">
                      Skip
                    </Button>
                  </>
                )}

                {status.status === "failed" && (
                  <Button onClick={onExecute} color="red">
                    Retry
                  </Button>
                )}
              </div>
            </div>

            {status.error && (
              <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="flex gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
                  <p className="text-sm text-red-800 dark:text-red-200">
                    {status.error}
                  </p>
                </div>
              </div>
            )}
          </div>

          {hasContent && (
            <AccordionTrigger className="px-6 pb-2 pt-2">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                {status.logs.length > 0
                  ? `View ${status.logs.length} log${status.logs.length > 1 ? "s" : ""}`
                  : "View details"}
              </span>
            </AccordionTrigger>
          )}

          {hasContent && (
            <AccordionContent className="px-6 pb-6">
              {status.logs.length > 0 && (
                <div className="space-y-1">
                  <h4 className="text-sm font-medium mb-2">Execution Logs</h4>
                  <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-3 text-xs font-mono space-y-1 max-h-64 overflow-y-auto">
                    {status.logs.map((log, i) => (
                      <div
                        key={i}
                        className={cn(
                          "flex gap-2",
                          log.level === "error" &&
                            "text-red-600 dark:text-red-400",
                          log.level === "warn" &&
                            "text-amber-600 dark:text-amber-400",
                        )}
                      >
                        <span className="text-zinc-500 dark:text-zinc-600">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <span>{log.message}</span>
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
