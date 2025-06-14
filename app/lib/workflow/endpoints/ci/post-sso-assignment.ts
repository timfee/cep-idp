import { z } from "zod";
import { API_PATHS } from "../../constants";
import { ApiContext, callEndpoint } from "../utils";

type RequestBody = Record<string, unknown>;

const ResponseSchema = z.unknown();

export interface PostSsoAssignmentParams {
  body: RequestBody;
}
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
