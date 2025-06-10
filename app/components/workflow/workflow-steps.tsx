"use client";
import "client-only";

import React from "react";
import { StepCard } from "./step-card";
import type { Workflow, Step, StepStatus } from "@/app/lib/workflow";
import { isTokenExpired } from "@/app/lib/auth/oauth-client";
import { STATUS_VALUES, ROLE_PREFIXES } from "@/app/lib/workflow/constants";

interface WorkflowStepsProps {
  workflow: Workflow;
  stepStatuses: Record<string, StepStatus>;
  authStatus: {
    google: { authenticated: boolean; scopes: string[]; expiresAt?: number };
    microsoft: { authenticated: boolean; scopes: string[]; expiresAt?: number };
  };
  variables: Record<string, string>;
}

export function WorkflowSteps({
  workflow,
  stepStatuses,
  authStatus,
  variables,
}: WorkflowStepsProps) {
  // Calculate completed steps
  const completedSteps = new Set(
    Object.entries(stepStatuses)
      .filter(
        ([, status]) =>
          status.status === STATUS_VALUES.COMPLETED ||
          status.status === STATUS_VALUES.SKIPPED,
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
      step.role.startsWith(ROLE_PREFIXES.GOOGLE_DIR) ||
      step.role.startsWith(ROLE_PREFIXES.GOOGLE_CI);
    const isMicrosoftStep = step.role.startsWith(ROLE_PREFIXES.MICROSOFT);

    if (isGoogleStep && authStatus.google.authenticated) {
      const notExpired =
        !authStatus.google.expiresAt ||
        !isTokenExpired({
          accessToken: "",
          expiresAt: authStatus.google.expiresAt || 0,
          scope: [],
        });
      return (
        notExpired &&
        requiredScopes.every((scope: string) =>
          authStatus.google.scopes.includes(scope),
        )
      );
    } else if (isMicrosoftStep && authStatus.microsoft.authenticated) {
      const notExpired =
        !authStatus.microsoft.expiresAt ||
        !isTokenExpired({
          accessToken: "",
          expiresAt: authStatus.microsoft.expiresAt || 0,
          scope: [],
        });
      return (
        notExpired &&
        requiredScopes.every((scope: string) =>
          authStatus.microsoft.scopes.includes(scope),
        )
      );
    }

    return false;
  };

  return (
    <div className="space-y-4">
      {workflow.steps.map((step: Step) => {
        const status = stepStatuses[step.name] || {
          status: STATUS_VALUES.PENDING,
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
            variables={variables}
          />
        );
      })}
    </div>
  );
}
