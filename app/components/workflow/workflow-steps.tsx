"use client";

import { useTransition, useOptimistic } from "react";
import { StepCard } from "./step-card";
import { 
  executeWorkflowStep, 
  skipWorkflowStep 
} from "@/app/actions/workflow";
import type { Workflow, WorkflowState, Step, StepStatus } from "@/app/lib/workflow/types";

interface WorkflowStepsProps {
  workflow: Workflow;
  stepStatuses: Record<string, StepStatus>;
  authStatus: {
    google: { authenticated: boolean; scopes: string[] };
    microsoft: { authenticated: boolean; scopes: string[] };
  };
}

export function WorkflowSteps({ workflow, stepStatuses, authStatus }: WorkflowStepsProps) {
  const [isPending, startTransition] = useTransition();
  const [optimisticStatuses, setOptimisticStatuses] = useOptimistic(stepStatuses);

  // Calculate completed steps
  const completedSteps = new Set(
    Object.entries(optimisticStatuses)
      .filter(([, status]) => 
        status.status === "completed" || status.status === "skipped"
      )
      .map(([name]) => name)
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
    const isGoogleStep = step.role.startsWith("dir") || step.role.startsWith("ci");
    const isMicrosoftStep = step.role.startsWith("graph");
    
    if (isGoogleStep && authStatus.google.authenticated) {
      return requiredScopes.every(scope => 
        authStatus.google.scopes.includes(scope)
      );
    } else if (isMicrosoftStep && authStatus.microsoft.authenticated) {
      return requiredScopes.every(scope => 
        authStatus.microsoft.scopes.includes(scope)
      );
    }
    
    return false;
  };

  const handleExecute = async (stepName: string) => {
    startTransition(async () => {
      setOptimisticStatuses(prev => ({
        ...prev,
        [stepName]: {
          status: "running",
          logs: [],
          startedAt: Date.now(),
        },
      }));
      await executeWorkflowStep(stepName);
    });
  };

  const handleSkip = async (stepName: string) => {
    startTransition(async () => {
      setOptimisticStatuses(prev => ({
        ...prev,
        [stepName]: {
          status: "skipped",
          logs: [],
          completedAt: Date.now(),
        },
      }));
      await skipWorkflowStep(stepName);
    });
  };

  return (
    <div className="space-y-4">
      {workflow.steps.map((step) => {
        const status = optimisticStatuses[step.name] || {
          status: "pending" as const,
          logs: [],
        };

        const canExecute = step.depends_on
          ? step.depends_on.every(dep => completedSteps.has(dep))
          : true;

        const isAuthValid = isAuthValidForStep(step);

        return (
          <StepCard
            key={step.name}
            step={step}
            status={status}
            canExecute={canExecute && !isPending}
            isAuthValid={isAuthValid}
            onExecute={() => handleExecute(step.name)}
            onSkip={() => handleSkip(step.name)}
          />
        );
      })}
    </div>
  );
}