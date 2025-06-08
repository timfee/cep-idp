import { NextRequest, NextResponse } from 'next/server';
import { getToken, getWorkflowState, setWorkflowState } from '@/app/lib/auth/tokens';
import { parseWorkflow } from '@/app/lib/workflow/parser';
import { StepExecutor } from '@/app/lib/workflow/executor';
import { evaluateGenerator } from '@/app/lib/workflow/variables';
import { LogEntry } from '@/app/lib/workflow/types';

export async function POST(request: NextRequest) {
  try {
    const { stepName } = await request.json();

    // Get current state
    const state = await getWorkflowState();
    const workflow = parseWorkflow();

    // Get tokens
    const googleToken = await getToken('google');
    const microsoftToken = await getToken('microsoft');

    const tokens = {
      google: googleToken ?? undefined,
      microsoft: microsoftToken ?? undefined,
    };

    // Find step
    const step = workflow.steps.find(s => s.name === stepName);
    if (!step) {
      return NextResponse.json({ error: 'Step not found' }, { status: 404 });
    }

    // Initialize variables with defaults
    for (const [name, varDef] of Object.entries(workflow.variables)) {
      if (!(name in state.variables)) {
        if (varDef.default) {
          state.variables[name] = varDef.default;
        } else if (varDef.generator) {
          state.variables[name] = evaluateGenerator(varDef.generator);
        }
      }
    }

    // Create executor
    const logs: LogEntry[] = [];
    const executor = new StepExecutor(
      workflow,
      state.variables,
      (log) => logs.push(log),
      (name, value) => { state.variables[name] = value; }
    );

    // Execute step
    const status = await executor.executeStep(step, tokens);
    status.logs = logs;

    // Update state
    state.stepStatus[stepName] = status;
    await setWorkflowState(state);

    return NextResponse.json({ status, variables: state.variables });
  } catch (error: unknown) {
    console.error('Step execution failed:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
