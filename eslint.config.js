import js from "@eslint/js";
import vue from "eslint-plugin-vue";
import vueParser from "vue-eslint-parser";
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
    ],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  ...vue.configs["flat/recommended"],
  {
    files: ["**/*.vue"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parser: vueParser,
      parserOptions: {
        sourceType: "module",
        ecmaVersion: "latest",
      },
      globals: {
        definePageMeta: "readonly",
        defineEventHandler: "readonly",
        setResponseStatus: "readonly",
        getQuery: "readonly",
        readBody: "readonly",
        createError: "readonly",
        $fetch: "readonly",
        navigateTo: "readonly",
        useRouter: "readonly",
        useRoute: "readonly",
        useState: "readonly",
        useAsyncData: "readonly",
        useFetch: "readonly",
        useSupabase: "readonly",
        useUserStore: "readonly",
        defineComponent: "readonly",
        computed: "readonly",
        ref: "readonly",
        reactive: "readonly",
        watch: "readonly",
        watchEffect: "readonly",
        onMounted: "readonly",
        onUnmounted: "readonly",
      },
    },
    rules: {
      "vue/multi-word-component-names": "off",
      "vue/no-v-html": "warn",
      "no-console": ["warn", { allow: ["warn", "error", "debug"] }],
      // Disable TypeScript-specific rules for Vue files
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    files: [
      "**/*.ts",
      "!**/*.test.ts",
      "!**/*.spec.ts",
      "!__tests__/**/*",
      "!vitest.config.ts",
      "!vitest.config.minimal.ts",
      "!playwright.config.ts",
      "!scripts/**/*.js",
      "!server/**/*.ts",
    ],
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
    languageOptions: {
      parser: ts.parser,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  prettier,
];
