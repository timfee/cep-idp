import { z } from "zod";

import { API_PATHS } from "../../constants";
import { ListSsoAssignmentsResponseSchema } from "../../schemas/responses";
import { ApiContext, callEndpoint } from "../utils";

const ParamsSchema = z.object({});

export type ListSsoAssignmentsParams = z.infer<typeof ParamsSchema>;
export type ListSsoAssignmentsResponse = z.infer<typeof ListSsoAssignmentsResponseSchema>;

export async function listSsoAssignments(
  ctx: ApiContext,
  _params: ListSsoAssignmentsParams = {}
): Promise<ListSsoAssignmentsResponse> {
  return callEndpoint({
    ctx,
    connection: "googleCI",
    method: "GET",
    pathTemplate: API_PATHS.SSO_ASSIGNMENTS,
    params: {},
    paramsSchema: ParamsSchema,
    responseSchema: ListSsoAssignmentsResponseSchema
  });
}
