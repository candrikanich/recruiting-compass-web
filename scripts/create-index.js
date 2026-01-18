import { writeFileSync, existsSync, mkdirSync } from 'fs'
import { resolve } from 'path'

const publicDir = resolve('.output/public')
const indexPath = resolve(publicDir, 'index.html')

// Create public dir if it doesn't exist
if (!existsSync(publicDir)) {
  mkdirSync(publicDir, { recursive: true })
}

// Only create if it doesn't exist (Nuxt might have created it)
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
  <script type="module" src="/_nuxt/entry.mjs"><\/script>
</body>
</html>`

  writeFileSync(indexPath, html)
  console.log('✓ Created index.html')
} else {
  console.log('✓ index.html already exists')
}

process.exit(0)
