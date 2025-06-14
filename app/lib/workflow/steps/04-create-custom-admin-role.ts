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
    const rolesResp = (await listRoles(ctx.api, {
      customerId,
    })) as unknown;

    interface RoleItem {
      roleName?: string;
      roleId?: string;
      rolePrivileges?: { serviceId?: string }[];
    }

    const existing = (rolesResp as { items?: RoleItem[] }).items?.find(
      (r) => r.roleName === "Microsoft Entra Provisioning"
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
    const privResp = (await listPrivileges(ctx.api, {
      customerId,
    })) as unknown;

    interface PrivItem {
      privilegeName?: string;
      serviceId?: string;
    }

    const dirServiceId = (privResp as { items?: PrivItem[] }).items?.find(
      (p) => p.privilegeName === "USERS_RETRIEVE"
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

      const createResp = (await postRole(ctx.api, {
        customerId,
        body: roleBody,
      })) as Record<string, unknown>;

      const outputs = OutputSchema.parse({
        adminRoleId: createResp.roleId ?? createResp.id ?? "",
        directoryServiceId: dirServiceId,
      });
      ctx.setVars(outputs);

      return StepResultSchema.parse({ success: true, mode: "executed", outputs });
    } catch (err: unknown) {
      ctx.log("error", "Failed to create custom role", err);
      return StepResultSchema.parse({
        success: false,
        mode: "skipped",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  },
};
