import { z } from "zod";

import { API_PATHS } from "../../constants";
import { ApiContext, callEndpoint } from "../utils";

const BodySchema = z.record(z.unknown());

const ParamsSchema = z.object({ samlProfileId: z.string(), body: BodySchema });

const ResponseSchema = z.unknown();

export type AddIdpCertParams = z.infer<typeof ParamsSchema>;
export type AddIdpCertResponse = z.infer<typeof ResponseSchema>;

export async function addIdpCert(
  ctx: ApiContext,
  params: AddIdpCertParams
): Promise<AddIdpCertResponse> {
  const { body, ...pathParams } = params;
  return callEndpoint({
    ctx,
    connection: "googleCI",
    method: "POST",
    pathTemplate: API_PATHS.ADD_IDP_CREDENTIALS,
    params: pathParams,
    paramsSchema: ParamsSchema.pick({ samlProfileId: true }),
    responseSchema: ResponseSchema,
    body,
  });
}
