import { z } from "zod";

import { API_PATHS } from "../../constants";
import { ApiContext, callEndpoint } from "../utils";

const BodySchema = z.record(z.unknown());

const ParamsSchema = z.object({
  body: BodySchema,
});

const ResponseSchema = z.unknown();

export type PostSsoAssignmentParams = z.infer<typeof ParamsSchema>;
export type PostSsoAssignmentResponse = z.infer<typeof ResponseSchema>;

export async function postSsoAssignment(
  ctx: ApiContext,
  params: PostSsoAssignmentParams
): Promise<PostSsoAssignmentResponse> {
  const { body } = params;
  return callEndpoint({
    ctx,
    connection: "googleCI",
    method: "POST",
    pathTemplate: API_PATHS.SSO_ASSIGNMENTS,
    params: {},
    paramsSchema: z.object({}).strict(),
    responseSchema: ResponseSchema,
    body,
  });
}
