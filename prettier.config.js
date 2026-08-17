/** @type {import("prettier").Config} */
export default {
  plugins: ["prettier-plugin-tailwindcss"],
  // Tailwind v4 entrypoint so custom theme utilities (brand-*, etc.) sort correctly
  tailwindStylesheet: "./assets/css/main.css",
};
