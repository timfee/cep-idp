import { z } from "zod";

import { ApiContext, callEndpoint } from "../utils";

const BodySchema = z.record(z.unknown());

const ParamsSchema = z.object({
  servicePrincipalId: z.string(),
  body: BodySchema,
});

const ResponseSchema = z.unknown();

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
    pathTemplate:
      "/servicePrincipals/{servicePrincipalId}/synchronization",
    params: pathParams,
    paramsSchema: ParamsSchema.pick({ servicePrincipalId: true }),
    responseSchema: ResponseSchema,
    body,
  });
}
