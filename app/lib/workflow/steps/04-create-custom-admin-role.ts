import { z } from "zod";

import { listPrivileges, listRoles, postRole } from "../endpoints/admin";
import { GOOGLE_PRIVILEGES, ROLE_NAMES } from "../constants";
import { StepDefinition, StepResultSchema } from "../types";
import { handleStepError } from "./utils";

const InputSchema = z.object({ customerId: z.string() });

const OutputSchema = z.object({
  adminRoleId: z.string(),
  directoryServiceId: z.string()
});

export const createCustomAdminRole: StepDefinition = {
  name: "Create Custom Admin Role",
  role: "dirRoleRW",
  inputs: ["customerId"],
  outputs: ["adminRoleId", "directoryServiceId"],

  async handler(ctx) {
    const { customerId } = InputSchema.parse({
      customerId: ctx.vars.customerId
    });

    try {
      const rolesResp = await listRoles(ctx.api, { customerId });
      const existing = rolesResp.items?.find(
        r => r.roleName === ROLE_NAMES.MS_ENTRA_PROVISIONING
      );
      
      if (existing && existing.roleId) {
        const outputs = OutputSchema.parse({
          adminRoleId: existing.roleId,
          directoryServiceId: existing.rolePrivileges?.[0]?.serviceId ?? ""
        });
        ctx.setVars(outputs);
        return StepResultSchema.parse({
          success: true,
          mode: "verified",
          outputs
        });
      }

      // Need directory serviceId – fetch from privileges
      const privResp = await listPrivileges(ctx.api, { customerId });
      const dirServiceId = privResp.items?.find(
        p => p.privilegeName === GOOGLE_PRIVILEGES.USERS_RETRIEVE
      )?.serviceId;

      if (!dirServiceId) {
        throw new Error("Could not find directory service ID");
      }

      const roleBody = {
        roleName: ROLE_NAMES.MS_ENTRA_PROVISIONING,
        roleDescription: ROLE_NAMES.MS_ENTRA_DESC,
        rolePrivileges: [
          { serviceId: dirServiceId, privilegeName: GOOGLE_PRIVILEGES.USERS_RETRIEVE },
          { serviceId: dirServiceId, privilegeName: GOOGLE_PRIVILEGES.USERS_CREATE },
          { serviceId: dirServiceId, privilegeName: GOOGLE_PRIVILEGES.USERS_UPDATE }
        ]
      };

      const createResp = await postRole(ctx.api, {
        customerId,
        body: roleBody
      });

      const outputs = OutputSchema.parse({
        adminRoleId: createResp.roleId,
        directoryServiceId: dirServiceId
      });
      ctx.setVars(outputs);

      return StepResultSchema.parse({
        success: true,
        mode: "executed",
        outputs
      });
    } catch (err: unknown) {
      return handleStepError(err, this.name, ctx);
    }
  }
};
