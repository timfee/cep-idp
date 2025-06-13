import { z } from "zod";

import { ApiContext, callEndpoint } from "../utils";

const ParamsSchema = z.object({
  ssoTemplateId: z.string(),
});

const ResponseSchema = z.unknown();

export type InstantiateSSOParams = z.infer<typeof ParamsSchema>;
export type InstantiateSSOResponse = z.infer<typeof ResponseSchema>;

export async function instantiateSSO(
  ctx: ApiContext,
  params: InstantiateSSOParams
): Promise<InstantiateSSOResponse> {
  return callEndpoint({
    ctx,
    connection: "graphGA",
    method: "POST",
    pathTemplate: "/applicationTemplates/{ssoTemplateId}/instantiate",
    params,
    paramsSchema: ParamsSchema,
    responseSchema: ResponseSchema,
  });
}
