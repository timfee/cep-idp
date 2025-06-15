import fs from "fs";
import type { Config } from "jest";
import nextJest from "next/jest.js";
import { default as path } from "path";
import { pathsToModuleNameMapper } from "ts-jest";

/**
 * Reads and parses the tsconfig.json file, removing any comments to prevent parsing errors.
 */
function readTsConfig() {

  const tsConfigPath = path.resolve(__dirname, "./tsconfig.json");
  const tsConfigFile = fs.readFileSync(tsConfigPath, "utf8");

  // Strip comments from the JSON file.
  const cleanedJson = tsConfigFile.replace(
    /\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g,
    (m, g) => (g ? "" : m)
  );
  const tsConfig = JSON.parse(cleanedJson);

  return tsConfig;
}

const { compilerOptions } = readTsConfig();

const createJestConfig = nextJest({ dir: "./" });

// Remove transformIgnorePatterns from this configuration.
const customConfig: Config = {
  testEnvironment: "node",
  moduleNameMapper: {
    "^server-only$": "<rootDir>/__tests__/stubs/server-only.ts",
    "^@/app/env$": "<rootDir>/__tests__/stubs/env.ts",
    "^app/env$": "<rootDir>/__tests__/stubs/env.ts",
    "^.*env\.ts$": "<rootDir>/__tests__/stubs/env.ts",
    ...pathsToModuleNameMapper(compilerOptions.paths, {
      prefix: "<rootDir>/",
    }),
  },
  globalSetup: "<rootDir>/jest.globalSetup.ts",
  globalTeardown: "<rootDir>/jest.globalTeardown.ts",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testMatch: ["**/?(*.)+(test).[tj]s?(x)"],
  transform: {
    "^.+\\.(ts|tsx)$": ["ts-jest", { tsconfig: "tsconfig.spec.json" }],
  },
  transformIgnorePatterns: []
};

export default createJestConfig(customConfig);
