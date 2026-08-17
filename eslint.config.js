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

// Phase 7 (audit-remediation): `new Date("YYYY-MM-DD")` parses a date-only
// string as UTC midnight, which renders/compares one calendar day early in
// every US timezone. Force date-only values through utils/localDate.ts
// instead. Also flags the `toISOString().split("T")[0]` idiom used to derive
// a UTC-anchored "today", which has the same class of bug in reverse.
const DATE_ONLY_LITERAL = /^\d{4}-\d{2}-\d{2}$/;

const noDateOnlyStringConstructor = {
  meta: { type: "problem", schema: [] },
  create(context) {
    const filename = context.getFilename();
    // The utility module itself is the one place allowed to parse date-only
    // strings — it does so using local date parts, not `new Date(string)`.
    if (filename.endsWith("utils/localDate.ts")) return {};

    return {
      NewExpression(node) {
        if (
          node.callee.type !== "Identifier" ||
          node.callee.name !== "Date" ||
          node.arguments.length !== 1
        ) {
          return;
        }
        const [arg] = node.arguments;
        if (arg.type === "Literal" && typeof arg.value === "string") {
          if (DATE_ONLY_LITERAL.test(arg.value)) {
            context.report({
              node,
              message:
                'new Date("YYYY-MM-DD") parses as UTC midnight, which renders/compares a day early in US timezones. Use parseLocalDateOnly() from ~/utils/localDate instead.',
            });
          }
        }
      },
      // Matches `<expr>.toISOString().split("T")[0]` — a UTC-anchored
      // "today"/date-only string that drifts a day after ~5-8pm US local time.
      CallExpression(node) {
        if (
          node.callee.type !== "MemberExpression" ||
          node.callee.property.type !== "Identifier" ||
          node.callee.property.name !== "split"
        ) {
          return;
        }
        const target = node.callee.object;
        if (
          target.type === "CallExpression" &&
          target.callee.type === "MemberExpression" &&
          target.callee.property.type === "Identifier" &&
          target.callee.property.name === "toISOString"
        ) {
          context.report({
            node,
            message:
              'toISOString().split("T")[0] derives a UTC-anchored date string, which drifts a day after ~5-8pm US local time. Use formatLocalDateOnly()/getLocalToday() from ~/utils/localDate instead.',
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
      ".worktrees",
      ".worktrees/**/*",
      ".claude/worktrees",
      ".claude/worktrees/**/*",
      "coverage",
      "*.cjs",
      ".vite",
      "__tests__",
      "tests/**/*",
      "**/*.vue", // Temporarily ignore Vue files due to parsing issues
      ".env*",
      "PORT=*/**/*",
      "playwright.config.ts",
      "playwright-report/**",
      "test-results/**",
      "vitest.config.ts",
      // tsconfig.json excludes `**/*.test.ts`, so type-aware linting cannot
      // parse the co-located util tests.
      "utils/**/*.test.ts",
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
    files: ["**/*.ts"],
    plugins: {
      local: {
        rules: {
          "no-supabase-in-composables": noSupabaseInComposables,
          "no-date-only-string-constructor": noDateOnlyStringConstructor,
        },
      },
    },
    rules: {
      "local/no-date-only-string-constructor": "error",
    },
  },
  {
    files: ["composables/**/*.ts"],
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
  // Phase 10b (audit-remediation): raw console.* calls bypass the structured
  // client/server loggers (createClientLogger/useLogger/createLogger) —
  // no redaction, no correlation ID, no level gating. Enforce logger usage
  // everywhere except: the logger implementations themselves (they ARE the
  // sink), the global top-level error-handler catch-all (deliberately logs
  // raw before Nuxt's normal handling can run), and build/CLI scripts under
  // scripts/ (run outside the app runtime, never bundled to client/server).
  {
    files: ["**/*.ts", "**/*.js"],
    ignores: [
      "utils/logger.ts",
      "server/utils/logger.ts",
      "plugins/error-handler.client.ts",
      "scripts/**/*",
    ],
    rules: {
      // `console.group`/`groupEnd`/`table` have no logger equivalent (rich
      // formatted dev-only output, e.g. useAuth.ts's `import.meta.dev`-gated
      // auth-state debug helpers) — allow those specifically, still forbid
      // log/warn/error/debug/info which all have a structured-logger path.
      "no-console": ["error", { allow: ["group", "groupEnd", "table"] }],
    },
  },
  {
    files: ["scripts/**/*.js", "scripts/**/*.mjs", "scripts/**/*.cjs"],
    languageOptions: {
      globals: {
        process: "readonly",
        console: "readonly",
        fetch: "readonly",
        URL: "readonly",
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
