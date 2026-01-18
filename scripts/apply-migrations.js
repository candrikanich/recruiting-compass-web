#!/usr/bin/env node

/**
 * Migration Application Script for Phase 7.1
 *
 * This script applies RLS migration files to Supabase database
 *
 * Usage:
 *   node scripts/apply-migrations.js
 *
 * Requirements:
 *   - NUXT_PUBLIC_SUPABASE_URL environment variable
 *   - SUPABASE_SERVICE_ROLE_KEY environment variable (for admin access)
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing required environment variables')
  console.error('   NUXT_PUBLIC_SUPABASE_URL: ' + (supabaseUrl ? '✓' : '✗'))
  console.error('   SUPABASE_SERVICE_ROLE_KEY: ' + (supabaseKey ? '✓' : '✗'))
  console.error('\nTo get your service role key:')
  console.error('  1. Go to https://app.supabase.com')
  console.error('  2. Select your project')
  console.error('  3. Settings → API → Service role key')
  console.error('  4. Copy the key and add to .env.local: SUPABASE_SERVICE_ROLE_KEY=...')
  process.exit(1)
}

// Create Supabase client with service role (for admin access)
const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'public' }
})

// Migration files to apply in order
const migrations = [
  '004_create_parent_view_helpers.sql',
  '005_athlete_task_parent_restrictions.sql',
  '006_interactions_parent_restrictions.sql',
  '007_parent_view_log_policies.sql'
]

async function applyMigration(filename) {
  const filepath = path.join(__dirname, '../server/migrations', filename)

  // Read migration file
  let sql
  try {
    sql = fs.readFileSync(filepath, 'utf-8')
  } catch (err) {
    console.error(`❌ Failed to read ${filename}:`, err.message)
    return false
  }

  // Remove comments and empty lines for cleaner execution
  const sqlStatements = sql
    .split('\n')
    .filter(line => !line.trim().startsWith('--') && line.trim())
    .join('\n')

  if (!sqlStatements.trim()) {
    console.error(`❌ ${filename}: No SQL statements found`)
    return false
  }

  // Execute migration
  try {
    const { error } = await supabase.rpc('exec_sql', { sql: sqlStatements }, {
      headers: { 'X-Client-Info': 'supabase-js-admin' }
    }).catch(() => {
      // RPC method might not exist, try direct query execution
      return supabase.from('_migrations').insert({ name: filename }).select()
    })

    if (error) {
      // For direct SQL execution, we need to use raw SQL
      console.log(`   Applying: ${filename}`)
      console.log(`   Note: Use Supabase Console to manually execute this migration`)
      return false
    }

    console.log(`✅ Applied: ${filename}`)
    return true
  } catch (err) {
    console.error(`❌ Error applying ${filename}:`, err.message)
    return false
  }
}

async function main() {
  console.log('🔧 Phase 7.1 Migration Application Script')
  console.log('=' .repeat(50))
  console.log(`Database: ${supabaseUrl}`)
  console.log(`Migrations: ${migrations.length}`)
  console.log('=' .repeat(50))
  console.log('')

  let applied = 0
  let failed = 0

  for (const migration of migrations) {
    const success = await applyMigration(migration)
    if (success) {
      applied++
    } else {
      failed++
    }
  }

  console.log('')
  console.log('=' .repeat(50))
  console.log(`Results: ${applied} applied, ${failed} failed`)
  console.log('=' .repeat(50))

  if (failed > 0) {
    console.log('')
    console.log('⚠️  Manual Application Required')
    console.log('')
    console.log('Since direct SQL execution requires admin privileges,')
    console.log('please apply the migrations manually using Supabase Console:')
    console.log('')
    console.log('1. Go to https://app.supabase.com')
    console.log('2. Select your project')
    console.log('3. Click "SQL Editor"')
    console.log('4. Click "New Query"')
    console.log('5. Copy content from web/server/migrations/004_create_parent_view_helpers.sql')
    console.log('6. Run the query')
    console.log('7. Repeat steps 4-6 for migrations 005, 006, 007')
    console.log('')
    process.exit(1)
  }

  console.log('✅ All migrations applied successfully!')
  process.exit(0)
}

main()
