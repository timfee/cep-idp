'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Workflow, WorkflowState, StepStatus, Step } from './lib/workflow/types';
import { AuthStatus } from './components/workflow/auth-status';
import { StepCard } from './components/workflow/step-card';
import { VariableViewer } from './components/workflow/variable-viewer';
import { StaticAlert, StaticAlertTitle, StaticAlertDescription } from './components/static-alert';
import { Heading } from './components/heading';

export default function WorkflowPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 dark:border-zinc-100"></div></div>}>
      <WorkflowPageInner />
    </Suspense>
  );
}

function WorkflowPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [state, setState] = useState<WorkflowState>({
    variables: {},
    stepStatus: {},
    tokens: {},
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadWorkflowAndState = useCallback(async () => {
    try {
      // Load workflow
      const workflowRes = await fetch('/api/workflow');
      if (!workflowRes.ok) {
        throw new Error('Workflow load failed');
      }
      const workflowData = await workflowRes.json();
      setWorkflow(workflowData);

      // Load state
      const stateRes = await fetch('/api/workflow/state');
      if (!stateRes.ok) {
        throw new Error('Workflow state load failed');
      }
      const stateData = await stateRes.json();
      setState(stateData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load workflow';
      setError(message);
      setWorkflow(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load workflow and state
  useEffect(() => {
    loadWorkflowAndState();
  }, [loadWorkflowAndState]);

  // Handle OAuth errors
  useEffect(() => {
    const error = searchParams.get('error');
    if (error) {
      setError(`Authentication error: ${error}`);
      router.replace('/', { scroll: false });
    }
  }, [searchParams, router]);


  const handleAuthenticate = useCallback((provider: 'google' | 'microsoft') => {
    window.location.href = `/api/auth/${provider}`;
  }, []);

  const executeStep = useCallback(async (stepName: string) => {
    try {
      // Update UI to show running
      setState(prev => ({
        ...prev,
        stepStatus: {
          ...prev.stepStatus,
          [stepName]: { 
            status: 'running', 
            logs: [],
            startedAt: Date.now()
          },
        },
      }));

      const res = await fetch('/api/workflow/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepName }),
      });

      const data = await res.json();
      
      if (res.ok) {
        setState(prev => ({
          ...prev,
          variables: data.variables,
          stepStatus: {
            ...prev.stepStatus,
            [stepName]: data.status,
          },
        }));
      } else {
        throw new Error(data.error || 'Step execution failed');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        stepStatus: {
          ...prev.stepStatus,
          [stepName]: {
            status: 'failed',
            error: message,
            logs: [],
            completedAt: Date.now(),
          },
        },
      }));
    }
  }, []);

  const skipStep = useCallback(async (stepName: string) => {
    setState(prev => ({
      ...prev,
      stepStatus: {
        ...prev.stepStatus,
        [stepName]: {
          status: 'skipped',
          logs: [],
          completedAt: Date.now(),
        },
      },
    }));
  }, []);

  const getRequiredScopes = useCallback(
    (step: Step) => {
      if (!step.role) return [];
      return workflow?.roles[step.role] || [];
    },
    [workflow]
  );


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 dark:border-zinc-100"></div>
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <StaticAlert variant="error">
          <StaticAlertTitle>Error</StaticAlertTitle>
          <StaticAlertDescription>Failed to load workflow configuration</StaticAlertDescription>
        </StaticAlert>
      </div>
    );
  }

  const completedSteps = new Set(
    Object.entries(state.stepStatus)
      .filter(([, status]) => status.status === 'completed' || status.status === 'skipped')
      .map(([name]) => name)
  );

  const allRequiredGoogleScopes = Array.from(new Set(
    workflow.steps
      .filter(step => step.role && (
        step.role.startsWith('dir') || step.role.startsWith('ci')
      ))
      .flatMap(step => workflow.roles[step.role!] || [])
  ));

  const allRequiredMicrosoftScopes = Array.from(new Set(
    workflow.steps
      .filter(step => step.role && step.role.startsWith('graph'))
      .flatMap(step => workflow.roles[step.role!] || [])
  ));

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <Heading level={1} className="mb-8">
          Federated SSO Workflow Setup
        </Heading>

        {error && (
          <StaticAlert variant="error" className="mb-6">
            <StaticAlertTitle>Error</StaticAlertTitle>
            <StaticAlertDescription>{error}</StaticAlertDescription>
          </StaticAlert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Auth Status */}
            <div className="space-y-4">
              <h2 className="text-lg font-medium">Authentication</h2>
              <AuthStatus
                provider="google"
                isAuthenticated={!!state.tokens.google}
                scopes={state.tokens.google?.scope || []}
                requiredScopes={allRequiredGoogleScopes}
                onAuthenticate={() => handleAuthenticate('google')}
              />
              <AuthStatus
                provider="microsoft"
                isAuthenticated={!!state.tokens.microsoft}
                scopes={state.tokens.microsoft?.scope || []}
                requiredScopes={allRequiredMicrosoftScopes}
                onAuthenticate={() => handleAuthenticate('microsoft')}
              />
            </div>

            {/* Workflow Steps */}
            <div className="space-y-4">
              <h2 className="text-lg font-medium">Workflow Steps</h2>
              {workflow.steps.map((step: Step) => {
                const status = state.stepStatus[step.name] || {
                  status: 'pending',
                  logs: [],
                } as StepStatus;
                
                const canExecute = step.depends_on 
                  ? step.depends_on.every(dep => completedSteps.has(dep))
                  : true;

                const requiredScopes = getRequiredScopes(step);
                const isGoogleStep = step.role?.startsWith('dir') || step.role?.startsWith('ci');
                const isMicrosoftStep = step.role?.startsWith('graph');
                
                let isAuthValid = true;
                if (isGoogleStep && state.tokens.google) {
                  isAuthValid = requiredScopes.every(scope => 
                    state.tokens.google!.scope.includes(scope)
                  );
                } else if (isMicrosoftStep && state.tokens.microsoft) {
                  isAuthValid = requiredScopes.every(scope => 
                    state.tokens.microsoft!.scope.includes(scope)
                  );
                } else if (step.role) {
                  isAuthValid = false;
                }

                return (
                  <StepCard
                    key={step.name}
                    step={step}
                    status={status}
                    canExecute={canExecute}
                    isAuthValid={isAuthValid}
                    onExecute={() => executeStep(step.name)}
                    onSkip={() => skipStep(step.name)}
                  />
                );
              })}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <VariableViewer variables={state.variables} />
          </div>
        </div>
      </div>
    </div>
  );
}
