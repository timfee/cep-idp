import { Endpoint, parseWorkflow } from "../workflow";

export function getEndpoint(name: string): Endpoint | undefined {
  const workflow = parseWorkflow();
  return workflow.endpoints[name];
}
