import { z } from "zod";

import { ApiContext, callEndpoint } from "../utils";

const ParamsSchema = z.object({});
const ResponseSchema = z.unknown();

export type ListSsoAssignmentsParams = z.infer<typeof ParamsSchema>;
export type ListSsoAssignmentsResponse = z.infer<typeof ResponseSchema>;

export async function listSsoAssignments(
  ctx: ApiContext,
  _params: ListSsoAssignmentsParams = {}
): Promise<ListSsoAssignmentsResponse> {
  return callEndpoint({
    ctx,
    connection: "googleCI",
    method: "GET",
    pathTemplate: "/inboundSsoAssignments",
    params: {},
    paramsSchema: ParamsSchema,
    responseSchema: ResponseSchema,
  });
}
