import type { Config } from "jest";
import nextJest from "next/jest.js";

import { createDefaultEsmPreset, pathsToModuleNameMapper } from "ts-jest";
import { readFileSync } from "fs";

function readTsConfig() {
  const text = readFileSync("./tsconfig.json", "utf8");
  const cleaned = text
    .replace(/\s*\/\/.*$/gm, "")
    .replace(/,(?=\s*[}\]])/g, "");
  return JSON.parse(cleaned);
}

const tsConfig = readTsConfig();

const createJestConfig = nextJest({ dir: "./" });

/**
 * Custom Jest config to match our Next.js setup.
 * next/jest will handle ESM modules and TypeScript transforms automatically.
 */
const customConfig: Config = {
  testEnvironment: "node",
  moduleNameMapper: {
    // stub Next.js server-only imports
    "^server-only$": "<rootDir>/test-utils/serverOnlyStub.ts",
    // map tsconfig paths (e.g. '@/...' → '<rootDir>/...')
    ...pathsToModuleNameMapper(tsConfig.compilerOptions.paths ?? {}, {
      prefix: "<rootDir>/",
    }),
  },
  globalSetup: "<rootDir>/jest.globalSetup.ts",
  globalTeardown: "<rootDir>/jest.globalTeardown.ts",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  extensionsToTreatAsEsm: [".ts", ".tsx", ".js", ".jsx"],
};

export default createJestConfig(createDefaultEsmPreset(customConfig));
