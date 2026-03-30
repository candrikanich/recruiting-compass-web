import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import ts from "typescript-eslint";
import process from "process";

// Architecture rule: composables must not call Supabase directly — use stores instead.
// Enforces: Page → Composable → Pinia Store → Supabase/API
const noSupabaseInComposables = {
  meta: { type: "problem", schema: [] },
  create(context) {
    const filename = context.getFilename();
    if (!filename.includes("/composables/")) return {};
    // Allow useSupabase.ts — it IS the singleton wrapper
    if (filename.endsWith("useSupabase.ts")) return {};
    const forbidden = ["useSupabaseClient", "useSupabaseAdmin"];
    return {
      ImportDeclaration(node) {
        // Allow type-only imports (e.g. `import type { User }`) — types are fine
        if (node.importKind === "type") return;
        if (node.source.value.toString().includes("@supabase/supabase-js")) {
          context.report({
            node,
            message:
              "Composables must not import from @supabase/supabase-js directly. Use a Pinia store instead.",
          });
        }
      },
      CallExpression(node) {
        if (
          node.callee.type === "Identifier" &&
          forbidden.includes(node.callee.name)
        ) {
          context.report({
            node,
            message: `Composables must not call ${node.callee.name}() directly. Use a Pinia store instead.`,
          });
        }
      },
    };
  },
};

export default [
  {
    ignores: [
      ".nuxt",
      ".nuxt/**/*",
      "dist",
      "node_modules",
      ".output",
      ".vercel",
      ".vercel/**/*",
      "coverage",
      "*.cjs",
      ".vite",
      "__tests__",
      "tests/**/*",
      "**/*.vue", // Temporarily ignore Vue files due to parsing issues
      ".env*",
      "PORT=*/**/*",
      "playwright.config.ts",
      "vitest.config.ts",
      "utils/positions.test.ts",
    ],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: ts.parser,
      parserOptions: {
        // Only enable type-aware linting for composables, stores, and utils
        // to reduce memory usage in CI environments
        ...(process.env.CI
          ? {}
          : { project: "./tsconfig.json", extraFileExtensions: [".vue"] }),
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
    files: ["composables/**/*.ts"],
    plugins: {
      local: {
        rules: { "no-supabase-in-composables": noSupabaseInComposables },
      },
    },
    rules: {
      "local/no-supabase-in-composables": "error",
    },
  },
  {
    files: ["**/*.test.ts", "**/*.spec.ts", "__tests__/**/*"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    files: ["scripts/**/*.js", "scripts/**/*.mjs"],
    languageOptions: {
      globals: {
        process: "readonly",
        console: "readonly",
        fetch: "readonly",
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
