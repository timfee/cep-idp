import { z } from "zod";

import { API_PATHS } from "../../constants";
import { GraphSyncResponseSchema } from "../../schemas/responses";
import { createEndpoint } from "../factory";

const ParamsSchema = z.object({ servicePrincipalId: z.string() });

export type GetSyncParams = z.infer<typeof ParamsSchema>;
export type GetSyncResponse = z.infer<typeof GraphSyncResponseSchema>;

export const getSync = createEndpoint({
  connection: "graphBeta",
  method: "GET",
  pathTemplate: API_PATHS.SYNC,
  paramsSchema: ParamsSchema,
  responseSchema: GraphSyncResponseSchema
});
