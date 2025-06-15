import { z } from "zod";
import { API_PATHS } from "../../constants";
import { PatchSyncBodySchema } from "../../schemas/requests";
import { GraphNoContentResponseSchema } from "../../schemas/responses";
import { createEndpoint } from "../factory";

const ParamsSchema = z.object({
  servicePrincipalId: z.string(),
  body: PatchSyncBodySchema,
});

export type PatchSyncParams = z.infer<typeof ParamsSchema>;
export type PatchSyncResponse = z.infer<typeof GraphNoContentResponseSchema>;

export const patchSync = createEndpoint({
  connection: "graphBeta",
  method: "PATCH",
  pathTemplate: API_PATHS.SYNC,
  paramsSchema: ParamsSchema,
  responseSchema: GraphNoContentResponseSchema,
  bodyExtractor: (params) => params.body,
});
