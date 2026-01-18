import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.join(__dirname, '..', 'dist', 'public')
const indexPath = path.join(publicDir, 'index.html')
const redirectsPath = path.join(publicDir, '_redirects')

// Create minimal index.html for SPA fallback
const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Baseball Recruiting Tracker</title>
</head>
<body>
  <div id="__nuxt"></div>
  <script type="module" src="/_nuxt/entry.js"></script>
</body>
</html>`

// Create _redirects for Netlify SPA fallback
const redirects = `/* /index.html 200`

try {
  fs.writeFileSync(indexPath, html)
  console.log(`✓ Generated index.html at ${indexPath}`)

  fs.writeFileSync(redirectsPath, redirects)
  console.log(`✓ Generated _redirects at ${redirectsPath}`)
} catch (err) {
  console.error('Error generating files:', err)
  process.exit(1)
}
