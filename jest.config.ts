import fs from "fs";
import type { Config } from "jest";
import nextJest from "next/jest.js";
import { default as path } from "path";
import { pathsToModuleNameMapper } from "ts-jest";
import { fileURLToPath } from "url";

/**
 * Reads and parses the tsconfig.json file, removing any comments to prevent parsing errors.
 */
function readTsConfig() {
  // Get the directory name in an ES module-safe way.
  const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

const customConfig: Config = {
  testEnvironment: "node",
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, {
    prefix: "<rootDir>/"
  }),
  globalSetup: "<rootDir>/jest.globalSetup.ts",
  globalTeardown: "<rootDir>/jest.globalTeardown.ts",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  transform: {
    "^.+\\.(ts|tsx)$": ["ts-jest", { tsconfig: "tsconfig.spec.json" }]
  },
  transformIgnorePatterns: ["node_modules/(?!(.pnpm/)?@t3-oss/env-nextjs)"]
};

export default createJestConfig(customConfig);
