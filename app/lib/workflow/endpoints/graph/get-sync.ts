import { z } from "zod";

import { API_PATHS } from "../../constants";
import { GraphSyncResponseSchema } from "../../schemas/responses";
import { ApiContext, callEndpoint } from "../utils";

const ParamsSchema = z.object({ servicePrincipalId: z.string() });

const ResponseSchema = GraphSyncResponseSchema;

export type GetSyncParams = z.infer<typeof ParamsSchema>;
export type GetSyncResponse = z.infer<typeof GraphSyncResponseSchema>;

export async function getSync(
  ctx: ApiContext,
  params: GetSyncParams
): Promise<GetSyncResponse> {
  return callEndpoint({
    ctx,
    connection: "graphBeta",
    method: "GET",
    pathTemplate: API_PATHS.SYNC,
    params,
    paramsSchema: ParamsSchema,
    responseSchema: GraphSyncResponseSchema
  });
}
