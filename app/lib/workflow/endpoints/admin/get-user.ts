import { z } from "zod";

import { API_PATHS } from "../../constants";
import { UserSchema } from "../../schemas/responses";
import { createEndpoint } from "../factory";

const ParamsSchema = z.object({ userEmail: z.string().email() });

export type GetUserParams = z.infer<typeof ParamsSchema>;
export type GetUserResponse = z.infer<typeof UserSchema>;

export const getUser = createEndpoint({
  connection: "googleAdmin",
  method: "GET",
  pathTemplate: API_PATHS.USER_BY_EMAIL,
  paramsSchema: ParamsSchema,
  responseSchema: UserSchema,
});
