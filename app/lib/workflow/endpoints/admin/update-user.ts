import { createEndpoint } from "../factory";
const ParamsSchema = z.object({
  userEmail: z.string().email(),
  body: z.record(z.unknown())
});
export const updateUser = createEndpoint({
  connection: "googleAdmin",
  method: "PUT",
  pathTemplate: API_PATHS.USER_BY_EMAIL,
  paramsSchema: ParamsSchema,
  responseSchema: UserSchema,
  bodyExtractor: (params) => params.body
});
    connection: "googleAdmin",
    method: "PUT",
    pathTemplate: API_PATHS.USER_BY_EMAIL,
    params: pathParams,
    paramsSchema: ParamsSchema.pick({ userEmail: true }),
    responseSchema: UserSchema,
    body
  });
}
