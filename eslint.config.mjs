import { FlatCompat } from "@eslint/eslintrc";
import sonar from "eslint-plugin-sonarjs";
import tsdoc from "eslint-plugin-tsdoc";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  {
    ignores: [
      "node_modules",
      "dist",
      "build",
      "coverage",
      ".next",
      "out",
      "public",
      "cypress",
      "e2e",
      "playwright",
      ".turbo",
      "scripts",
      "test-utils",
    ],
  },
  ...compat.extends(
    "next/core-web-vitals",
    "next/typescript",
    "plugin:promise/recommended"
  ),
  sonar.configs.recommended,
  {
    plugins: { tsdoc },
    rules: {
      "tsdoc/syntax": "off",
      "sonarjs/cognitive-complexity": "off",
      "no-magic-numbers": "off",
    },
  },
  {
    files: ["**/__tests__/**", "test/**"],
    rules: { "custom/no-console-log": "off", "no-magic-numbers": "off" },
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
    },
  },
];

export default eslintConfig;
