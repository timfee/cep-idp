import { z } from "zod";

import { API_PATHS } from "../../constants";
import { ListSamlProfilesResponseSchema } from "../../schemas/responses";
import { createEndpoint } from "../factory";

const ParamsSchema = z.object({});

export type ListSamlProfilesParams = z.infer<typeof ParamsSchema>;
export type ListSamlProfilesResponse = z.infer<typeof ListSamlProfilesResponseSchema>;

export const listSamlProfiles = createEndpoint({
  connection: "googleCI",
  method: "GET",
  pathTemplate: API_PATHS.SAML_PROFILES,
  paramsSchema: ParamsSchema,
  responseSchema: ListSamlProfilesResponseSchema
});
