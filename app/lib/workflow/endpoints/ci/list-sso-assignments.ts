import { z } from "zod";

import { API_PATHS } from "../../constants";
import { ListSsoAssignmentsResponseSchema } from "../../schemas/responses";
import { createEndpoint } from "../factory";

const ParamsSchema = z.object({});

export type ListSsoAssignmentsParams = z.infer<typeof ParamsSchema>;
export type ListSsoAssignmentsResponse = z.infer<typeof ListSsoAssignmentsResponseSchema>;

export const listSsoAssignments = createEndpoint({
  connection: "googleCI",
  method: "GET",
  pathTemplate: API_PATHS.SSO_ASSIGNMENTS,
  paramsSchema: ParamsSchema,
  responseSchema: ListSsoAssignmentsResponseSchema
});
