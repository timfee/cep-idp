import { z } from "zod";

import { ApiContext } from "../api-adapter";
import { HttpMethod } from "../constants";
import { API_PATHS } from "../../workflow/constants";

// Re-export so endpoint modules can continue importing from this helper.
export type { ApiContext };

/** Extract `{var}` placeholders from a template path. */
const VAR_REGEX = /\{(\w+)}/g;

/**
 * Replaces placeholders in a path template with param values, validating that
 * every variable is supplied.
 */
export function buildPath(
  template: string,
  params: Record<string, string | number>
): string {
  return template.replace(VAR_REGEX, (_match, varName) => {
    if (!(varName in params)) {
      throw new Error(`Missing required parameter '${varName}' for path`);
    }
    return encodeURIComponent(String(params[varName]));
  });
}

/**
 * Generic helper used by the concrete endpoint wrappers.
 */
export async function callEndpoint<
  P extends Record<string, unknown>,
  R,
>(options: {
  ctx: ApiContext;
  connection: string;
  method: HttpMethod;
  pathTemplate: keyof typeof API_PATHS | string;
  params: P;
  paramsSchema: z.ZodType<P>;
  responseSchema: z.ZodType<R>;
  query?: Record<string, string | undefined>;
  body?: unknown;
}): Promise<R> {
  const { ctx, connection, method, pathTemplate } = options;
  const validatedParams = options.paramsSchema.parse(options.params);

  const path = buildPath(
    typeof pathTemplate === "string" ? pathTemplate : API_PATHS[pathTemplate],
    validatedParams as Record<string, string | number>
  );

  const response = await ctx.request(connection, method, path, {
    query: options.query,
    body: options.body,
  });

  return options.responseSchema.parse(response);
}
