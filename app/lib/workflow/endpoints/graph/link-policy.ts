import { z } from "zod";
import { API_PATHS } from "../../constants";
import { LinkPolicyBodySchema } from "../../schemas/requests";
import { GraphNoContentResponseSchema } from "../../schemas/responses";
import { createEndpoint } from "../factory";

const ParamsSchema = z.object({
  servicePrincipalId: z.string(),
  body: LinkPolicyBodySchema,
});

export type LinkPolicyParams = z.infer<typeof ParamsSchema>;
export type LinkPolicyResponse = z.infer<typeof GraphNoContentResponseSchema>;

export const linkPolicy = createEndpoint({
  connection: "graphBeta",
  method: "POST",
  pathTemplate: API_PATHS.LINK_POLICY,
  paramsSchema: ParamsSchema,
  responseSchema: GraphNoContentResponseSchema,
  bodyExtractor: (params) => params.body,
});
