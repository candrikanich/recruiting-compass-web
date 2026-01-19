import { defineNuxtConfig } from "nuxt/config";
import { execSync } from "child_process";
import { existsSync, writeFileSync } from "fs";
import { resolve } from "path";

export default defineNuxtConfig({
  compatibilityDate: "2025-12-05",
  ssr: false,
  app: {
    baseURL: "/",
  },
  devtools: { enabled: false },
  telemetry: {
    enabled: false,
  },
  experimental: {
    appManifest: false,
  },
  typescript: {
    includeWorkspace: true,
    builder: "shared" as const,
  },
  nitro: {
    prerender: false,
    output: {
      publicDir: ".output/public",
    },
    hooks: {
      "build:done": () => {
        const indexPath = resolve(".output/public/index.html");
        // If index.html wasn't created, create a minimal SPA shell
        if (!existsSync(indexPath)) {
          const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>The Recruiting Compass</title>
</head>
<body>
  <div id="__nuxt"></div>
  <script type="module" src="/_nuxt/entry.mjs"></script>
</body>
</html>`;
          writeFileSync(indexPath, html);
        }
      },
    },
  },
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },
  runtimeConfig: {
    // Server-only (secure)
    twitterBearerToken: "",
    twitterApiSecret: "",
    twitterApiKey: "",
    instagramAccessToken: "",
    instagramAppSecret: "",
    public: {
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL || "",
      supabaseAnonKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY || "",
    },
  },
});
