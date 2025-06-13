import { z } from "zod";

import { API_PATHS } from "../../constants";
import { ApiContext, callEndpoint } from "../utils";

// ---------------------------------------------------------------------------
// Schema definitions
// ---------------------------------------------------------------------------

const ParamsSchema = z.object({
  customerId: z.string(),
  domainName: z.string(),
});

// The Admin SDK returns a complex object we don't fully model yet. Accept any.
const ResponseSchema = z.unknown();

export type GetDomainParams = z.infer<typeof ParamsSchema>;
export type GetDomainResponse = z.infer<typeof ResponseSchema>;

// GET https://admin.googleapis.com/admin/directory/v1/customer/{customerId}/domains/{domainName}
export async function getDomain(
  ctx: ApiContext,
  params: GetDomainParams
): Promise<GetDomainResponse> {
  return callEndpoint({
    ctx,
    connection: "googleAdmin",
    method: "GET",
    pathTemplate: API_PATHS.DOMAIN_BY_NAME,
    params,
    paramsSchema: ParamsSchema,
    responseSchema: ResponseSchema,
  });
}
