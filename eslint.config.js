import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import ts from "typescript-eslint";

export default [
  {
    ignores: [
      ".nuxt",
      "dist",
      "node_modules",
      ".output",
      "coverage",
      "*.cjs",
      ".gitlab-ci.yml",
      ".vite",
      "__tests__",
      "tests/**/*",
      "**/*.vue", // Temporarily ignore Vue files due to parsing issues
    ],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: ts.parser,
      parserOptions: {
        project: "./tsconfig.json",
        extraFileExtensions: [".vue"],
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: ["**/*.test.ts", "**/*.spec.ts", "__tests__/**/*"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    files: ["scripts/**/*.js"],
    languageOptions: {
      globals: {
        process: "readonly",
        console: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        Buffer: "readonly",
        module: "readonly",
        require: "readonly",
        exports: "readonly",
      },
    },
  },
  prettier,
];
