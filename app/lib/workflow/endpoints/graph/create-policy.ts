import { z } from "zod";
import { API_PATHS } from "../../constants";
import { ApiContext, callEndpoint } from "../utils";

type RequestBody = Record<string, unknown>;

const ResponseSchema = z
  .unknown()
  .describe("Microsoft Graph create claimsMappingPolicy response");

export interface CreatePolicyParams {
  body: RequestBody;
}
export type CreatePolicyResponse = z.infer<typeof ResponseSchema>;

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
    paramsSchema: z.object({}).strict().describe("No path parameters"),
    responseSchema: ResponseSchema,
    body
  });
}
