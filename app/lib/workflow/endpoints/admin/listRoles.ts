import { z } from "zod";

import { ApiContext, callEndpoint } from "../utils";

const ParamsSchema = z.object({
  customerId: z.string(),
});

const ResponseSchema = z.unknown();

export type ListRolesParams = z.infer<typeof ParamsSchema>;
export type ListRolesResponse = z.infer<typeof ResponseSchema>;

export async function listRoles(
  ctx: ApiContext,
  params: ListRolesParams
): Promise<ListRolesResponse> {
  return callEndpoint({
    ctx,
    connection: "googleAdmin",
    method: "GET",
    pathTemplate: "/customer/{customerId}/roles",
    params,
    paramsSchema: ParamsSchema,
    responseSchema: ResponseSchema,
  });
}
