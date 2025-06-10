import { readFileSync } from "fs";

const checks = [
  {
    file: "app/actions/workflow-execution.ts",
    pattern: /const workingVariables = \{ \.\.\.variables \}/,
    description: "Variable accumulation fix",
  },
  {
    file: "app/lib/workflow/constants.ts",
    pattern: /export const STATUS_VALUES = \{[\s\S]*PENDING:/,
    description: "Status constants defined",
  },
  {
    file: "app/lib/workflow/error-types.ts",
    exists: true,
    description: "Error types file created",
  },
  {
    file: "app/components/workflow/step-card.tsx",
    notPattern: /useState.*localExecutionResult/,
    description: "Local state removed",
  },
  {
    file: "app/components/workflow/step-card.tsx",
    notPattern: /status === "completed"/,
    description: "No magic strings",
  },
];

checks.forEach((check) => {
  try {
    const content = readFileSync(check.file, "utf8");
    if (check.pattern && !check.pattern.test(content)) {
      console.error(`❌ FAIL: ${check.description} in ${check.file}`);
    } else if (check.notPattern && check.notPattern.test(content)) {
      console.error(`❌ FAIL: ${check.description} in ${check.file}`);
    } else {
      console.log(`✅ PASS: ${check.description}`);
    }
  } catch (error) {
    if (check.exists && (error as NodeJS.ErrnoException).code === "ENOENT") {
      console.error(`❌ FAIL: ${check.file} does not exist`);
    } else {
      console.error(
        `❌ FAIL: Error processing check for ${check.file}:`,
        error
      );
    }
  }
});
