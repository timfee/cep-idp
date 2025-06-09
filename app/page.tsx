import { getWorkflowData } from "./actions/workflow-data";
import { AuthStatus } from "./components/workflow/auth-status";
import { WorkflowSteps } from "./components/workflow/workflow-steps";
import { VariableViewer } from "./components/workflow/variable-viewer";
import { DebugTools } from "./components/workflow/debug-tools";
import { Alert, AlertDescription, AlertTitle } from "./components/ui/alert";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function WorkflowPage({ searchParams }: PageProps) {
  // Handle OAuth errors
  const resolvedSearchParams = await searchParams;
  const error = resolvedSearchParams.error;

  try {
    // Fetch all workflow data server-side
    const { workflow, variables, stepStatuses, auth } = await getWorkflowData();

    // Calculate required scopes for each provider
    const allRequiredGoogleScopes = Array.from(
      new Set(
        workflow.steps
          .filter(
            (step) =>
              step.role &&
              (step.role.startsWith("dir") || step.role.startsWith("ci")),
          )
          .flatMap((step) => workflow.roles[step.role!] || []),
      ),
    );

    const allRequiredMicrosoftScopes = Array.from(
      new Set(
        workflow.steps
          .filter((step) => step.role && step.role.startsWith("graph"))
          .flatMap((step) => workflow.roles[step.role!] || []),
      ),
    );

    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <h1 className="text-2xl font-bold mb-8">
            Federated SSO Workflow Setup
          </h1>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertTitle>Authentication Error</AlertTitle>
              <AlertDescription>
                {typeof error === "string"
                  ? error
                  : "An error occurred during authentication"}
              </AlertDescription>
            </Alert>
          )}

          <DebugTools />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Auth Status */}
              <section className="space-y-4">
                <h2 className="text-lg font-medium">Authentication</h2>
                <AuthStatus
                  provider="google"
                  isAuthenticated={auth.google.authenticated}
                  scopes={auth.google.scopes}
                  requiredScopes={allRequiredGoogleScopes}
                />
                <AuthStatus
                  provider="microsoft"
                  isAuthenticated={auth.microsoft.authenticated}
                  scopes={auth.microsoft.scopes}
                  requiredScopes={allRequiredMicrosoftScopes}
                />
              </section>

              {/* Workflow Steps */}
              <section className="space-y-4">
                <h2 className="text-lg font-medium">Workflow Steps</h2>
                <WorkflowSteps
                  workflow={workflow}
                  stepStatuses={stepStatuses}
                  authStatus={auth}
                />
              </section>
            </div>

            {/* Sidebar */}
            <aside className="lg:col-span-1">
              <VariableViewer
                variables={variables}
                definitions={workflow.variables}
              />
            </aside>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Failed to load workflow:", error);

    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load workflow configuration. Please try refreshing the
            page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
}
