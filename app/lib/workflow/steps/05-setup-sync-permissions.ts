import { z } from "zod";

import { getRoleAssign, postRoleAssign } from "../endpoints/admin";
import { StepDefinition, StepResultSchema } from "../types";
import { handleStepError } from "./utils";

const InputSchema = z.object({
  customerId: z.string(),
  adminRoleId: z.string(),
  provisioningUserId: z.string()
});

export const setupSyncPermissions: StepDefinition = {
  name: "Setup Microsoft Sync Permissions",
  role: "dirRoleRW",
  inputs: ["customerId", "adminRoleId", "provisioningUserId"],

  async handler(ctx) {
    const { customerId, adminRoleId, provisioningUserId } = InputSchema.parse({
      customerId: ctx.vars.customerId,
      adminRoleId: ctx.vars.adminRoleId,
      provisioningUserId: ctx.vars.provisioningUserId
    });

    try {
      // Check if assignment exists
      const assignResp = await getRoleAssign(ctx.api, {
        customerId,
        roleId: adminRoleId,
        userKey: provisioningUserId
      });

      if ((assignResp.items?.length ?? 0) > 0) {
        return StepResultSchema.parse({ success: true, mode: "verified" });
      }

      await postRoleAssign(ctx.api, {
        customerId,
        body: { 
          roleId: adminRoleId, 
          assignedTo: provisioningUserId,
          scopeType: "CUSTOMER"
        }
      });
      
      return StepResultSchema.parse({ success: true, mode: "executed" });
    } catch (err: unknown) {
      return handleStepError(err, this.name, ctx);
    }
  }
};
