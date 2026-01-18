#!/usr/bin/env node

/**
 * Migration Preparation Script for Phase 7.1
 *
 * This script reads migration files and prepares them for manual application
 * to Supabase via the web console.
 *
 * Usage:
 *   node scripts/prepare-migrations.js
 *
 * This will output each migration file in a format ready to copy-paste
 * into Supabase SQL Editor.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const migrations = [
  '004_create_parent_view_helpers.sql',
  '005_athlete_task_parent_restrictions.sql',
  '006_interactions_parent_restrictions.sql',
  '007_parent_view_log_policies.sql'
]

function prepareMigration(filename, index) {
  const filepath = path.join(__dirname, '../server/migrations', filename)

  try {
    const sql = fs.readFileSync(filepath, 'utf-8')
    return {
      success: true,
      filename,
      content: sql,
      lines: sql.split('\n').length
    }
  } catch (err) {
    return {
      success: false,
      filename,
      error: err.message
    }
  }
}

function main() {
  console.log('\n' + '='.repeat(70))
  console.log('PHASE 7.1: RLS MIGRATION PREPARATION')
  console.log('='.repeat(70))
  console.log('')

  const results = migrations.map((m, i) => prepareMigration(m, i + 1))
  const successful = results.filter(r => r.success)
  const failed = results.filter(r => !r.success)

  if (failed.length > 0) {
    console.log('❌ ERRORS:')
    failed.forEach(r => {
      console.log(`   ${r.filename}: ${r.error}`)
    })
    console.log('')
    process.exit(1)
  }

  console.log(`✅ Found ${successful.length} migration files`)
  console.log('')
  console.log('MANUAL APPLICATION STEPS:')
  console.log('-'.repeat(70))
  console.log('')

  successful.forEach((r, i) => {
    console.log(`STEP ${i + 1}: Apply ${r.filename}`)
    console.log('-'.repeat(70))
    console.log('')
    console.log('1. Go to: https://app.supabase.com')
    console.log('2. Select your project')
    console.log('3. Click "SQL Editor" in left sidebar')
    console.log('4. Click "+ New Query" button')
    console.log('5. Copy all text below and paste into the editor:')
    console.log('')
    console.log('--- START COPY HERE ---')
    console.log(r.content)
    console.log('--- END COPY HERE ---')
    console.log('')
    console.log('6. Click "Run" or press Ctrl+Enter')
    console.log('7. Verify success message appears')
    console.log('')
    if (i < successful.length - 1) {
      console.log(`⬇️  Continue to STEP ${i + 2}...`)
    }
    console.log('')
  })

  console.log('='.repeat(70))
  console.log('VERIFICATION:')
  console.log('-'.repeat(70))
  console.log('')
  console.log('After applying all migrations, run the verification script:')
  console.log('')
  console.log('1. In Supabase Console, click "+ New Query"')
  console.log('2. Copy content from: web/server/migrations/test_phase_7_1.sql')
  console.log('3. Run all queries')
  console.log('4. Verify results match expectations in comments')
  console.log('')
  console.log('='.repeat(70))
  console.log('')
}

main()
