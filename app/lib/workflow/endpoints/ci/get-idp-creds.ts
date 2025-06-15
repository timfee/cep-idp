import { z } from "zod";

import { API_PATHS } from "../../constants";
import { ResponseSchema } from "../../schemas/responses";
import { createEndpoint } from "../factory";

const ParamsSchema = z.object({ samlProfileId: z.string() });

export type GetIdpCredsParams = z.infer<typeof ParamsSchema>;
export type GetIdpCredsResponse = z.infer<typeof ResponseSchema>;

export const getIdpCreds = createEndpoint({
  connection: "googleCI",
  method: "GET",
  pathTemplate: API_PATHS.IDP_CREDENTIALS,
  paramsSchema: ParamsSchema,
  responseSchema: ResponseSchema
});
