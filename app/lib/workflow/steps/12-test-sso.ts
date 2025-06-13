import { StepDefinition, StepResultSchema } from "../types";

export const testSSOConfiguration: StepDefinition = {
  name: "Test SSO Configuration",
  manual: true,

  async handler(_ctx) {
    // Manual confirmation assumed complete
    return StepResultSchema.parse({ success: true, mode: "skipped" });
  },
};
