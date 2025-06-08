import { NextRequest, NextResponse } from "next/server";
import { executeWorkflowStep } from "@/app/actions/workflow";

export async function POST(request: NextRequest) {
  try {
    const { stepName } = await request.json();

    if (!stepName) {
      return NextResponse.json(
        { error: "Step name is required" },
        { status: 400 }
      );
    }

    // Delegate to server action
    const result = await executeWorkflowStep(stepName);

    if (result.success) {
      return NextResponse.json({
        status: result.status,
        variables: result.variables,
      });
    } else {
      return NextResponse.json(
        { error: result.error || "Step execution failed" },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    console.error("Step execution failed:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}