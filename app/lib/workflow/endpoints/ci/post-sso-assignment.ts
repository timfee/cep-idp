import { createEndpoint } from "../factory";
import { PostSsoAssignmentBodySchema } from "../../schemas/requests";
import { z } from "zod";
import { API_PATHS } from "../../constants";
import { OperationResponseSchema } from "../../schemas/responses";

type RequestBody = Record<string, unknown>;



export interface PostSsoAssignmentParams {
  body: RequestBody;
}
export type PostSsoAssignmentResponse = z.infer<typeof OperationResponseSchema>;

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
    responseSchema: OperationResponseSchema,
    body
  });
}
