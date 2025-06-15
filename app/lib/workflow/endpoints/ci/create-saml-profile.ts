import { z } from "zod";
import { API_PATHS } from "../../constants";
import { CreateSamlProfileBodySchema } from "../../schemas/requests";
import { OperationResponseSchema } from "../../schemas/responses";
import { createEndpoint } from "../factory";

const ParamsSchema = z.object({ body: CreateSamlProfileBodySchema });

export type CreateSamlProfileParams = z.infer<typeof ParamsSchema>;
export type CreateSamlProfileResponse = z.infer<typeof OperationResponseSchema>;

export const createSamlProfile = createEndpoint({
  connection: "googleCI",
  method: "POST",
  pathTemplate: API_PATHS.SAML_PROFILES,
  paramsSchema: ParamsSchema,
  responseSchema: OperationResponseSchema,
  bodyExtractor: (params) => params.body,
});
