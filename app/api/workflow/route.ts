import { NextResponse } from 'next/server';
import { parseWorkflow } from '@/app/lib/workflow/parser';

export async function GET() {
  try {
    const workflow = parseWorkflow();
    return NextResponse.json(workflow);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
