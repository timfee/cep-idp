import dotenv from "dotenv";
import type { Config } from "jest";
import { pathsToModuleNameMapper } from "ts-jest";
import fs from "fs";
import path from "path";

// Load the TypeScript configuration manually to avoid import assertion issues
const tsConfig = JSON.parse(
  fs.readFileSync(path.join(__dirname, "tsconfig.json"), "utf8")
);

dotenv.config({ path: ".env.local" });

const config: Config = {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts", ".tsx"],
  moduleNameMapper: {
    ...pathsToModuleNameMapper(tsConfig.compilerOptions.paths ?? {}, {
      prefix: "<rootDir>/",
    }),
    "^@/app/env$": "<rootDir>/test-utils/envStub.ts",
    "^server-only$": "<rootDir>/test-utils/serverOnlyStub.ts",
  },
  transformIgnorePatterns: [
    "/node_modules/(?!(?:@t3-oss/env-nextjs|@t3-oss/env-core)/)",
  ],
  globalSetup: "<rootDir>/jest.globalSetup.ts",
  globalTeardown: "<rootDir>/jest.globalTeardown.ts",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
};

export default config;
