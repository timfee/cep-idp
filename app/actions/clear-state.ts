"use server";

import { revalidatePath } from "next/cache";
import { clearGlobalState } from "./workflow-state";

/**
 * Clear all global workflow state for testing purposes
 */
export async function clearWorkflowState(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await clearGlobalState();
    revalidatePath("/");
    
    return { success: true };
  } catch (error) {
    console.error("Failed to clear workflow state:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}