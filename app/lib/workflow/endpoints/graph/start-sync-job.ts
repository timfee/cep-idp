import { z } from "zod";
import { API_PATHS } from "../../constants";
import { GraphNoContentResponseSchema } from "../../schemas/responses";
import { createEndpoint } from "../factory";

const ParamsSchema = z.object({
  servicePrincipalId: z.string(),
  jobId: z.string()
});

export type StartSyncJobParams = z.infer<typeof ParamsSchema>;
export type StartSyncJobResponse = z.infer<typeof GraphNoContentResponseSchema>;

export const startSyncJob = createEndpoint({
  connection: "graphBeta",
  method: "POST",
  pathTemplate: API_PATHS.START_SYNC,
  paramsSchema: ParamsSchema,
  responseSchema: GraphNoContentResponseSchema
});
