import { FlatCompat } from "@eslint/eslintrc";
import security from "eslint-plugin-security";
import sonar from "eslint-plugin-sonarjs";
import tsdoc from "eslint-plugin-tsdoc";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

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
    ],
  },
  ...compat.extends(
    "next/core-web-vitals",
    "next/typescript",
    "plugin:promise/recommended",
  ),
  security.configs.recommended,
  sonar.configs.recommended,
  {
    plugins: {
      tsdoc,
    },
    rules: {
      "tsdoc/syntax": "warn",
      "sonarjs/cognitive-complexity": ["warn", 20],
      "no-magic-numbers": ["warn", { ignore: [-1, 0, 1] }],
    },
  },
  {
    files: ["**/__tests__/**", "test/**"],
    rules: {
      "custom/no-console-log": "off",
      "no-magic-numbers": "off",
    },
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
