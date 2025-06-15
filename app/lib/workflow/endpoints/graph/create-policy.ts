import { createEndpoint } from "../factory";
import { CreatePolicyBodySchema } from "../../schemas/requests";
import { z } from "zod";
import { API_PATHS } from "../../constants";
import { CreatePolicyResponseSchema } from "../../schemas/responses";

type RequestBody = Record<string, unknown>;

const ResponseSchema = CreatePolicyResponseSchema;

export interface CreatePolicyParams {
  body: RequestBody;
}
export type CreatePolicyResponse = z.infer<typeof CreatePolicyResponseSchema>;

export async function createPolicy(
  ctx: ApiContext,
  params: CreatePolicyParams
): Promise<CreatePolicyResponse> {
  const { body } = params;
  return callEndpoint({
    ctx,
    connection: "graphBeta",
    method: "POST",
    pathTemplate: API_PATHS.CREATE_TOKEN_POLICY,
    params: {},
    paramsSchema: z.object({}).strict(),
    responseSchema: CreatePolicyResponseSchema,
    body
  });
}
