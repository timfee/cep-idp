import { z } from "zod";
import { API_PATHS } from "../../constants";
import { ApiContext, callEndpoint } from "../utils";

// Type returned by the UI when constructing the SAML profile payload.
type RequestBody = Record<string, unknown>;

const ResponseSchema = z
  .unknown()
  .describe("Cloud Identity Operation response for createSamlProfile");

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
    paramsSchema: z
      .object({})
      .strict()
      .describe("No path parameters for createSamlProfile"),
    responseSchema: ResponseSchema,
    body,
  });
}
