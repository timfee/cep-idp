import { z } from "zod";

import { StepDefinition, StepResultSchema } from "../types";
import { listRoles, postRole, listPrivileges } from "../endpoints/admin";

const InputSchema = z.object({
  customerId: z.string(),
});

const OutputSchema = z.object({
  adminRoleId: z.string(),
  directoryServiceId: z.string(),
});

export const createCustomAdminRole: StepDefinition = {
  name: "Create Custom Admin Role",
  role: "dirRoleRW",
  inputs: ["customerId"],
  outputs: ["adminRoleId", "directoryServiceId"],

  async handler(ctx) {
    const { customerId } = InputSchema.parse({
      customerId: ctx.vars.customerId,
    });

    try {
      const rolesResp = await listRoles(ctx.api, { customerId });
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const existing = rolesResp.items?.find(
        (r: any) => r.roleName === "Microsoft Entra Provisioning"
      );
      if (existing) {
        const outputs = OutputSchema.parse({
          adminRoleId: existing.roleId,
          directoryServiceId: existing.rolePrivileges?.[0]?.serviceId ?? "",
        });
        ctx.setVars(outputs);
        return StepResultSchema.parse({ success: true, mode: "verified", outputs });
      }

      // Need directory serviceId – fetch from privileges
      const privResp = await listPrivileges(ctx.api, { customerId });
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const dirServiceId = privResp.items?.find(
        (p: any) => p.privilegeName === "USERS_RETRIEVE"
      )?.serviceId;

      const roleBody = {
        roleName: "Microsoft Entra Provisioning",
        roleDescription: "Custom role for Microsoft Entra provisioning service",
        rolePrivileges: [
          { serviceId: dirServiceId, privilegeName: "USERS_RETRIEVE" },
          { serviceId: dirServiceId, privilegeName: "USERS_CREATE" },
          { serviceId: dirServiceId, privilegeName: "USERS_UPDATE" },
        ],
      } as Record<string, unknown>;

      const createResp = await postRole(ctx.api, {
        customerId,
        body: roleBody,
      });

      const outputs = OutputSchema.parse({
        adminRoleId: createResp.roleId ?? createResp.id ?? "",
        directoryServiceId: dirServiceId,
      });
      ctx.setVars(outputs);

      return StepResultSchema.parse({ success: true, mode: "executed", outputs });
    } catch (error: any) {
      ctx.log("error", "Failed to create custom role", error);
      return StepResultSchema.parse({ success: false, mode: "skipped", error: String(error) });
    }
  },
};
