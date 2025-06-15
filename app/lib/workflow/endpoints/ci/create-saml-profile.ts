import { z } from "zod";
import { API_PATHS } from "../../constants";
import { OperationResponseSchema } from "../../schemas/responses";
import { ApiContext, callEndpoint } from "../utils";

// Type returned by the UI when constructing the SAML profile payload.
type RequestBody = Record<string, unknown>;



export interface CreateSamlProfileParams {
  body: RequestBody;
}
export type CreateSamlProfileResponse = z.infer<typeof OperationResponseSchema>;

export async function createSamlProfile(
  ctx: ApiContext,
  params: CreateSamlProfileParams
): Promise<CreateSamlProfileResponse> {
  const { body } = params;
  return callEndpoint({
    ctx,
    connection: "googleCI",
    method: "POST",
    pathTemplate: API_PATHS.SAML_PROFILES,
    params: {},
    paramsSchema: z.object({}).strict(),
    responseSchema: OperationResponseSchema,
    body
  });
}
