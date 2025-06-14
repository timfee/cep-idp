import { z } from "zod";
import { API_PATHS } from "../../constants";
import { ApiContext, callEndpoint } from "../utils";

type RequestBody = Record<string, unknown>;

const ResponseSchema = z.unknown();

export interface CreateSamlProfileParams {
  body: RequestBody;
}
export type CreateSamlProfileResponse = z.infer<typeof ResponseSchema>;

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
    responseSchema: ResponseSchema,
    body,
  });
}
