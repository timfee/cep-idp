import { z } from "zod";

import { API_PATHS } from "../../constants";
import { ListPoliciesResponseSchema } from "../../schemas/responses";
import { createEndpoint } from "../factory";

const ParamsSchema = z.object({ servicePrincipalId: z.string() });

export type ListPoliciesParams = z.infer<typeof ParamsSchema>;
export type ListPoliciesResponse = z.infer<typeof ListPoliciesResponseSchema>;

export const listPolicies = createEndpoint({
  connection: "graphBeta",
  method: "GET",
  pathTemplate: API_PATHS.TOKEN_POLICIES,
  paramsSchema: ParamsSchema,
  responseSchema: ListPoliciesResponseSchema
});
