import { Step, Action, ACTION_MODES } from "./types";

export function filterActions(step: Step, verificationOnly: boolean): Action[] {
  if (!step.actions) return [];
  return step.actions.filter((action) => {
    const modes = action.mode ?? [ACTION_MODES.VERIFY, ACTION_MODES.EXECUTE];
    if (verificationOnly) {
      return modes.includes(ACTION_MODES.VERIFY) && !action.fallback;
    }
    return modes.includes(ACTION_MODES.EXECUTE);
  });
}
