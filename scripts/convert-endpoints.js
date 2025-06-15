#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

function convertEndpoint(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");

    // Skip if already converted
    if (content.includes("createEndpoint")) {
      console.log(`  → Already converted`);
      return null;
    }

    // Extract key information using regex
    const functionMatch = content.match(/export async function (\w+)/);
    if (!functionMatch) return null;
    const functionName = functionMatch[1];

    // Simple GET endpoints without body
    if (content.includes('method: "GET"') && !content.includes("body:")) {
      const connectionMatch = content.match(/connection: "(\w+)"/);
      const pathMatch = content.match(
        /pathTemplate: (API_PATHS\.\w+|"[^"]+"),/
      );
      const responseMatch = content.match(/responseSchema: (\w+)/);
      const paramsMatch = content.match(
        /const ParamsSchema = (z\.object\([^;]+\));/s
      );

      if (!connectionMatch || !pathMatch || !responseMatch) return null;

      let newContent = `import { z } from "zod";

import { API_PATHS } from "../../constants";
import { ${responseMatch[1]} } from "../../schemas/responses";
import { createEndpoint } from "../factory";

${paramsMatch ? `const ParamsSchema = ${paramsMatch[1]};\n` : ""}
export type ${functionName.charAt(0).toUpperCase() + functionName.slice(1)}Params = z.infer<typeof ParamsSchema>;
export type ${functionName.charAt(0).toUpperCase() + functionName.slice(1)}Response = z.infer<typeof ${responseMatch[1]}>;

export const ${functionName} = createEndpoint({
  connection: "${connectionMatch[1]}",
  method: "GET",
  pathTemplate: ${pathMatch[1]},
  paramsSchema: ParamsSchema,
  responseSchema: ${responseMatch[1]}
});
`;
      return newContent;
    }

    // For POST/PUT/PATCH with body - keep existing for now
    console.log(`  → Complex endpoint, needs manual review`);
    return null;
  } catch (error) {
    console.error(`  → Error: ${error.message}`);
    return null;
  }
}

// Process all endpoint files
const endpointsDir = path.join(__dirname, "../app/lib/workflow/endpoints");
const subdirs = ["admin", "ci", "graph", "web"];

subdirs.forEach((subdir) => {
  const dir = path.join(endpointsDir, subdir);
  if (!fs.existsSync(dir)) return;

  console.log(`\nProcessing ${subdir}/`);

  fs.readdirSync(dir).forEach((file) => {
    if (
      file === "index.ts"
      || file === "factory.ts"
      || file === "utils.ts"
      || !file.endsWith(".ts")
    )
      return;

    const filePath = path.join(dir, file);
    console.log(`  ${file}:`);

    const converted = convertEndpoint(filePath);
    if (converted) {
      fs.writeFileSync(filePath, converted);
      console.log(`  → ✓ Converted successfully`);
    }
  });
});

console.log("\n✓ Endpoint conversion complete");
