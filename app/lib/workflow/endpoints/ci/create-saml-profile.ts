import { z } from "zod";

import { API_PATHS } from "../../constants";
import { ApiContext, callEndpoint } from "../utils";

const BodySchema = z.record(z.unknown());

const ParamsSchema = z.object({
  body: BodySchema,
});

const ResponseSchema = z.unknown();

export type CreateSamlProfileParams = z.infer<typeof ParamsSchema>;
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
