let tokens = {};

// Try to load generated tokens, but don't fail if they don't exist yet
try {
  tokens = require("./packages/design-tokens/dist/tailwind.tokens.cjs");
} catch {
  console.warn(
    "Design tokens not found. Run: npm run build in packages/design-tokens/",
  );
}

module.exports = {
  content: [
    "./components/**/*.{js,vue,ts}",
    "./layouts/**/*.vue",
    "./pages/**/*.vue",
    "./plugins/**/*.{js,ts}",
    "./app.vue",
  ],
  theme: {
    extend: {
      colors: tokens.colors || {},
      spacing: tokens.spacing || {},
      borderRadius: tokens.borderRadius || {},
    },
  },
  plugins: [],
};
