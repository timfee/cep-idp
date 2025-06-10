import { Endpoint, parseWorkflow } from "../workflow";

/**
 * Look up an API endpoint definition by name.
 *
 * @param name - Identifier from the workflow file
 * @returns Endpoint configuration or `undefined`
 */
export function getEndpoint(name: string): Endpoint | undefined {
  const workflow = parseWorkflow();
  return workflow.endpoints[name];
}
