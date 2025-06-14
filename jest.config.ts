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
    "^server-only$": "<rootDir>/test-utils/serverOnlyStub.ts",
    "^@/app/env$": "<rootDir>/test-utils/envStub.ts",
    "^app/env$": "<rootDir>/test-utils/envStub.ts",
    "^.*env\.ts$": "<rootDir>/test-utils/envStub.ts",
    ...pathsToModuleNameMapper(compilerOptions.paths, {
      prefix: "<rootDir>/",
    }),
  },
  globalSetup: "<rootDir>/jest.globalSetup.ts",
  globalTeardown: "<rootDir>/jest.globalTeardown.ts",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  transform: {
    "^.+\\.(ts|tsx)$": ["ts-jest", { tsconfig: "tsconfig.spec.json" }],
  },
  transformIgnorePatterns: []
};

export default createJestConfig(customConfig);
