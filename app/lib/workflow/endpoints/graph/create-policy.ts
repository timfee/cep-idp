import { z } from "zod";
import { API_PATHS } from "../../constants";
import { CreatePolicyBodySchema } from "../../schemas/requests";
import { CreatePolicyResponseSchema } from "../../schemas/responses";
import { createEndpoint } from "../factory";

const ParamsSchema = z.object({ body: CreatePolicyBodySchema });

export type CreatePolicyParams = z.infer<typeof ParamsSchema>;
export type CreatePolicyResponse = z.infer<typeof CreatePolicyResponseSchema>;

export const createPolicy = createEndpoint({
  connection: "graphBeta",
  method: "POST",
  pathTemplate: API_PATHS.CREATE_TOKEN_POLICY,
  paramsSchema: ParamsSchema,
  responseSchema: CreatePolicyResponseSchema,
  bodyExtractor: (params) => params.body,
});
