import { z } from "zod";

import { ApiContext, callEndpoint } from "../utils";

const BodySchema = z.record(z.unknown());

const ParamsSchema = z.object({
  body: BodySchema,
});

const ResponseSchema = z.unknown();

export type CreatePolicyParams = z.infer<typeof ParamsSchema>;
export type CreatePolicyResponse = z.infer<typeof ResponseSchema>;

export async function createPolicy(
  ctx: ApiContext,
  params: CreatePolicyParams
): Promise<CreatePolicyResponse> {
  const { body } = params;
  return callEndpoint({
    ctx,
    connection: "graphBeta",
    method: "POST",
    pathTemplate: "/policies/tokenIssuancePolicies",
    params: {},
    paramsSchema: z.object({}).strict(),
    responseSchema: ResponseSchema,
    body,
  });
}
