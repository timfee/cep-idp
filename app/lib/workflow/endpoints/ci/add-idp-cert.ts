import { z } from "zod";

import { API_PATHS } from "../../constants";
import { ApiContext, callEndpoint } from "../utils";

const BodySchema = z
  .record(z.unknown())
  .describe("JSON body containing the PEM certificate to add to IdP profile");

const ParamsSchema = z
  .object({ samlProfileId: z.string(), body: BodySchema })
  .describe("Path parameters and body for add IdP certificate API call");

const ResponseSchema = z
  .unknown()
  .describe("Cloud Identity Operation response for addIdpCert");

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
    body
  });
}
