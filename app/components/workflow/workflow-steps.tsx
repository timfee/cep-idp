"use client";
import "client-only";

import { isTokenExpired } from "@/app/lib/auth/oauth-client";
import { parseWorkflow } from "@/app/lib/workflow";
import { ROLE_PREFIXES, STATUS_VALUES } from "@/app/lib/workflow/constants";
import type { StepDefinition, StepStatus } from "@/app/lib/workflow/types";
import { StepCard } from "./step-card";

interface WorkflowStepsProps {
  workflow: ReturnType<typeof parseWorkflow>;
  stepStatuses: Record<string, StepStatus>;
  authStatus: {
    google: { authenticated: boolean; scopes: string[]; expiresAt?: number };
    microsoft: { authenticated: boolean; scopes: string[]; expiresAt?: number };
  };
  variables: Record<string, string>;
}

/**
 * High-level component that renders an ordered list of `WorkflowStep`
 * objects using {@link StepCard}.  It drives step-level animations and
 * ensures that the viewport scrolls to the active step while the workflow
 * is running.
 *
 * @param steps - Ordered array returned by the workflow engine
 * @param currentIndex - Zero-based index of the step currently executing
 * @returns React fragment containing a stack of `StepCard` components
 */
export function WorkflowSteps({
  workflow,
  stepStatuses,
  authStatus,
  variables
}: WorkflowStepsProps) {
  // Calculate completed steps
  const completedSteps = new Set(
    Object.entries(stepStatuses)
      .filter(
        ([, status]) =>
          status.status === STATUS_VALUES.COMPLETED
          || status.status === STATUS_VALUES.SKIPPED
      )
      .map(([name]) => name)
  );

  // Helper to get required scopes for a step
  const getRequiredScopes = (step: StepDefinition) => {
    if (!step.role) return [];
    return (workflow.roles as Record<string, string[]>)[step.role] || [];
  };

  // Helper to check if auth is valid for a step
  const isAuthValidForStep = (step: StepDefinition) => {
    if (!step.role) return true;

    const requiredScopes = getRequiredScopes(step);
    const isGoogleStep =
      step.role.startsWith(ROLE_PREFIXES.GOOGLE_DIR)
      || step.role.startsWith(ROLE_PREFIXES.GOOGLE_CI);
    const isMicrosoftStep = step.role.startsWith(ROLE_PREFIXES.MICROSOFT);

    if (isGoogleStep && authStatus.google.authenticated) {
      const notExpired =
        !authStatus.google.expiresAt
        || !isTokenExpired({
          accessToken: "",
          expiresAt: authStatus.google.expiresAt || 0,
          scope: []
        });
      return (
        notExpired
        && requiredScopes.every((scope: string) =>
          authStatus.google.scopes.includes(scope)
        )
      );
    } else if (isMicrosoftStep && authStatus.microsoft.authenticated) {
      const notExpired =
        !authStatus.microsoft.expiresAt
        || !isTokenExpired({
          accessToken: "",
          expiresAt: authStatus.microsoft.expiresAt || 0,
          scope: []
        });
      return (
        notExpired
        && requiredScopes.every((scope: string) =>
          authStatus.microsoft.scopes.includes(scope)
        )
      );
    }

    return false;
  };

  return (
    <div className="space-y-4">
      {workflow.steps.map((step: StepDefinition) => {
        const status = stepStatuses[step.name] || {
          status: STATUS_VALUES.PENDING,
          logs: []
        };

        const canExecute =
          step.depends_on ?
            step.depends_on.every((dep: string) => completedSteps.has(dep))
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
