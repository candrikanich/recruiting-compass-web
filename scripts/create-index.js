import { writeFileSync, existsSync, mkdirSync } from "fs";
import { resolve } from "path";

const publicDir = resolve(".output/public");
const indexPath = resolve(publicDir, "index.html");
const distClientPath = resolve(".nuxt/dist/client");

// Ensure public directory exists
if (!existsSync(publicDir)) {
  mkdirSync(publicDir, { recursive: true });
}

// If index.html already exists, we're done
if (existsSync(indexPath)) {
  console.log("✓ index.html already exists in .output/public");
  process.exit(0);
}

// For SPA with Netlify, generate index.html if it's missing
// This happens when Nitro builds but doesn't copy the SPA template correctly
if (!existsSync(distClientPath)) {
  console.error("✗ Could not find Nuxt client build at .nuxt/dist/client");
  process.exit(1);
}

// Generate a basic index.html that will boot the Nuxt app
// The app bundle will be loaded from /_nuxt/entry.js
const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="The Recruiting Compass">
  <title>The Recruiting Compass</title>
</head>
<body>
  <div id="__nuxt"></div>
  <script type="module" src="/_nuxt/entry.js"></script>
</body>
</html>`;

writeFileSync(indexPath, html);
console.log("✓ Created index.html in .output/public");
process.exit(0);
