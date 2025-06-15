import { z } from "zod";
import { API_PATHS } from "../../constants";
import { UserSchema } from "../../schemas/responses";
import { CreateUserBodySchema } from "../../schemas/requests";
import { createEndpoint } from "../factory";

const ParamsSchema = z.object({ body: CreateUserBodySchema });

export type PostUserParams = z.infer<typeof ParamsSchema>;
export type PostUserResponse = z.infer<typeof UserSchema>;

export const postUser = createEndpoint({
  connection: "googleAdmin",
  method: "POST",
  pathTemplate: API_PATHS.USERS_ROOT,
  paramsSchema: ParamsSchema,
  responseSchema: UserSchema,
  bodyExtractor: (params) => params.body
});
