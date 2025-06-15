import { z } from "zod";
import { ApiContext, callEndpoint } from "./utils";
import { API_PATHS } from "../constants";
import { HttpMethod } from "./constants";

export function createEndpoint<TParams extends Record<string, unknown>, TResponse>(config: {
  connection: string;
  method: HttpMethod;
  pathTemplate: keyof typeof API_PATHS | string;
  paramsSchema: z.ZodType<TParams>;
  responseSchema: z.ZodType<TResponse>;
  queryParams?: (params: TParams) => Record<string, string | undefined>;
  bodyExtractor?: (params: TParams) => unknown;
}) {
  return async (ctx: ApiContext, params: TParams): Promise<TResponse> => {
    const validatedParams = config.paramsSchema.parse(params);
    const query = config.queryParams?.(validatedParams);
    const body = config.bodyExtractor?.(validatedParams);

    return callEndpoint({
      ctx,
      connection: config.connection,
      method: config.method,
      pathTemplate: config.pathTemplate,
      params: validatedParams,
      paramsSchema: config.paramsSchema,
      responseSchema: config.responseSchema,
      query,
      body
    });
  };
}
