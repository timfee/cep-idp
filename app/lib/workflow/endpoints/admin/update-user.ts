import { z } from "zod";
import { API_PATHS } from "../../constants";
import { UserSchema } from "../../schemas/responses";
import { UpdateUserBodySchema } from "../../schemas/requests";
import { createEndpoint } from "../factory";

const ParamsSchema = z.object({
  userEmail: z.string().email(),
  body: UpdateUserBodySchema
});

export type UpdateUserParams = z.infer<typeof ParamsSchema>;
export type UpdateUserResponse = z.infer<typeof UserSchema>;

export const updateUser = createEndpoint({
  connection: "googleAdmin",
  method: "PUT",
  pathTemplate: API_PATHS.USER_BY_EMAIL,
  paramsSchema: ParamsSchema,
  responseSchema: UserSchema,
  bodyExtractor: (params) => params.body
});
