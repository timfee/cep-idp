"use client";

import React from "react";
import { StepCard } from "./step-card";
import type { Workflow, Step, StepStatus } from "@/app/lib/workflow";

interface WorkflowStepsProps {
  workflow: Workflow;
  stepStatuses: Record<string, StepStatus>;
  authStatus: {
    google: { authenticated: boolean; scopes: string[] };
    microsoft: { authenticated: boolean; scopes: string[] };
  };
}

export function WorkflowSteps({
  workflow,
  stepStatuses,
  authStatus,
}: WorkflowStepsProps) {
  // Calculate completed steps
  const completedSteps = new Set(
    Object.entries(stepStatuses)
      .filter(
        ([, status]) =>
          status.status === "completed" || status.status === "skipped",
      )
      .map(([name]) => name),
  );

  // Helper to get required scopes for a step
  const getRequiredScopes = (step: Step) => {
    if (!step.role) return [];
    return workflow.roles[step.role] || [];
  };

  // Helper to check if auth is valid for a step
  const isAuthValidForStep = (step: Step) => {
    if (!step.role) return true;

    const requiredScopes = getRequiredScopes(step);
    const isGoogleStep =
      step.role.startsWith("dir") || step.role.startsWith("ci");
    const isMicrosoftStep = step.role.startsWith("graph");

    if (isGoogleStep && authStatus.google.authenticated) {
      return requiredScopes.every((scope: string) =>
        authStatus.google.scopes.includes(scope),
      );
    } else if (isMicrosoftStep && authStatus.microsoft.authenticated) {
      return requiredScopes.every((scope: string) =>
        authStatus.microsoft.scopes.includes(scope),
      );
    }

    return false;
  };

  return (
    <div className="space-y-4">
      {workflow.steps.map((step: Step) => {
        const status = stepStatuses[step.name] || {
          status: "pending" as const,
          logs: [],
        };

        const canExecute = step.depends_on
          ? step.depends_on.every((dep: string) => completedSteps.has(dep))
          : true;

        const isAuthValid = isAuthValidForStep(step);

        return (
          <StepCard
            key={step.name}
            step={step}
            status={status}
            canExecute={canExecute}
            isAuthValid={isAuthValid}
          />
        );
      })}
    </div>
  );
}
