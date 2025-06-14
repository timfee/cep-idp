import { z } from "zod";

import { API_PATHS } from "../../constants";
import { ApiContext, callEndpoint } from "../utils";

const BodySchema = z
  .record(z.unknown())
  .describe("Synchronization payload for PATCH sync settings");

const ParamsSchema = z
  .object({ servicePrincipalId: z.string(), body: BodySchema })
  .describe("Path parameter identifying ServicePrincipal plus request body");

const ResponseSchema = z
  .unknown()
  .describe("Microsoft Graph synchronization PATCH response (no content)");

export type PatchSyncParams = z.infer<typeof ParamsSchema>;
export type PatchSyncResponse = z.infer<typeof ResponseSchema>;

export async function patchSync(
  ctx: ApiContext,
  params: PatchSyncParams
): Promise<PatchSyncResponse> {
  const { body, ...pathParams } = params;
  return callEndpoint({
    ctx,
    connection: "graphGA",
    method: "PATCH",
    pathTemplate: API_PATHS.SYNC,
    params: pathParams,
    paramsSchema: ParamsSchema.pick({ servicePrincipalId: true }),
    responseSchema: ResponseSchema,
    body
  });
}
