import { z } from "zod";

import { API_PATHS } from "../../constants";
import { ApiContext, callEndpoint } from "../utils";

const ParamsSchema = z
  .object({})
  .describe("No parameters required for list inbound SSO assignments");

const ResponseSchema = z
  .unknown()
  .describe("Cloud Identity listInboundSsoAssignments API response payload");

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
    pathTemplate: API_PATHS.SSO_ASSIGNMENTS,
    params: {},
    paramsSchema: ParamsSchema,
    responseSchema: ResponseSchema,
  });
}
