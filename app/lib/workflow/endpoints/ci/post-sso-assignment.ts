import { z } from "zod";
import { API_PATHS } from "../../constants";
import { PostSsoAssignmentBodySchema } from "../../schemas/requests";
import { OperationResponseSchema } from "../../schemas/responses";
import { createEndpoint } from "../factory";

const ParamsSchema = z.object({ body: PostSsoAssignmentBodySchema });

export type PostSsoAssignmentParams = z.infer<typeof ParamsSchema>;
export type PostSsoAssignmentResponse = z.infer<typeof OperationResponseSchema>;

export const postSsoAssignment = createEndpoint({
  connection: "googleCI",
  method: "POST",
  pathTemplate: API_PATHS.SSO_ASSIGNMENTS,
  paramsSchema: ParamsSchema,
  responseSchema: OperationResponseSchema,
  bodyExtractor: (params) => params.body,
});
