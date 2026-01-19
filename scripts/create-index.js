import { writeFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'fs'
import { resolve } from 'path'

const publicDir = resolve('.output/public')
const nuxtDir = resolve(publicDir, '_nuxt')
const indexPath = resolve(publicDir, 'index.html')

// Create public dir if it doesn't exist
if (!existsSync(publicDir)) {
  mkdirSync(publicDir, { recursive: true })
}

// Find the actual entry file (ends with .js and is in _nuxt)
let entryFile = null
if (existsSync(nuxtDir)) {
  const files = readdirSync(nuxtDir)
  // Look for the actual entry point - it's usually one of the larger JS files
  // For Nuxt 3, we need to find the manifest or look at the structure
  // The safest approach: use the build's manifest.json if it exists in .nuxt/dist/client
  try {
    const manifestPath = resolve('.nuxt/dist/client/manifest.json')
    if (existsSync(manifestPath)) {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
      if (manifest && manifest['app.vue']) {
        const entry = manifest['app.vue']
        if (entry && entry.file) {
          entryFile = `/_nuxt/${entry.file}`
        } else if (entry && entry[0] && entry[0].file) {
          entryFile = `/_nuxt/${entry[0].file}`
        }
      }
    }
  } catch (e) {
    // Manifest not found or parse error
  }
}

// Fallback: just find the biggest JS file that looks like an entry point
if (!entryFile) {
  const jsFiles = readdirSync(nuxtDir)
    .filter(f => f.endsWith('.js'))
    .map(f => ({ name: f, size: statSync(resolve(nuxtDir, f)).size }))
    .sort((a, b) => b.size - a.size)

  if (jsFiles.length > 0) {
    entryFile = `/_nuxt/${jsFiles[0].name}`
  }
}

// Default fallback
if (!entryFile) {
  entryFile = '/_nuxt/entry.js'
}

const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>The Recruiting Compass</title>
</head>
<body>
  <div id="__nuxt"></div>
  <script type="module" src="${entryFile}"><\/script>
</body>
</html>`

writeFileSync(indexPath, html)
console.log(`✓ Created index.html with entry: ${entryFile}`)
process.exit(0)
