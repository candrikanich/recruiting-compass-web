/* eslint-disable no-undef */
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

// For SPA mode, Nuxt 3 should automatically create index.html
// This script is only needed if the file doesn't exist (e.g., in certain build environments)

const indexPath = resolve('.output/public/index.html')
const publicDir = resolve('.output/public')

if (!existsSync(indexPath)) {
  console.warn('⚠ index.html not found in .output/public, checking Nuxt build output...')

  // Check if dist exists
  const distPath = resolve('.nuxt/dist/client')
  if (!existsSync(distPath)) {
    console.error('✗ Could not find Nuxt build output at .nuxt/dist/client')
    process.exit(1)
  }

  // For SPA, Nuxt should create index.html automatically
  // If it's missing, the build output structure may be incorrect
  console.error('✗ Build output structure is incorrect - index.html should be in .output/public')
  process.exit(1)
}

console.log('✓ index.html found in .output/public')
process.exit(0)
