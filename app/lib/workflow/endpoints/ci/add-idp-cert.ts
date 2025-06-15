import { z } from "zod";
import { API_PATHS } from "../../constants";
import { OperationResponseSchema } from "../../schemas/responses";
import { AddIdpCertBodySchema } from "../../schemas/requests";
import { createEndpoint } from "../factory";

const ParamsSchema = z.object({
  samlProfileId: z.string(),
  body: AddIdpCertBodySchema
});

export type AddIdpCertParams = z.infer<typeof ParamsSchema>;
export type AddIdpCertResponse = z.infer<typeof OperationResponseSchema>;

export const addIdpCert = createEndpoint({
  connection: "googleCI",
  method: "POST",
  pathTemplate: API_PATHS.ADD_IDP_CREDENTIALS,
  paramsSchema: ParamsSchema,
  responseSchema: OperationResponseSchema,
  bodyExtractor: (params) => params.body
});
