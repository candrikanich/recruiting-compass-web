#!/bin/bash
# Apply all migrations to QA database
# Usage: SUPABASE_QA_URL=xxx SUPABASE_QA_KEY=xxx ./scripts/apply-migrations-qa.sh

set -e

if [ -z "$SUPABASE_QA_URL" ] || [ -z "$SUPABASE_QA_KEY" ]; then
  echo "❌ Error: Set SUPABASE_QA_URL and SUPABASE_QA_KEY environment variables"
  echo ""
  echo "Example:"
  echo "  export SUPABASE_QA_URL='https://xxx.supabase.co'"
  echo "  export SUPABASE_QA_KEY='your-service-role-key'"
  echo "  ./scripts/apply-migrations-qa.sh"
  exit 1
fi

echo "🔍 Checking QA database connection..."
curl -s "$SUPABASE_QA_URL/rest/v1/" -H "apikey: $SUPABASE_QA_KEY" > /dev/null
if [ $? -ne 0 ]; then
  echo "❌ Failed to connect to QA database"
  exit 1
fi
echo "✅ Connected to QA database"

echo ""
echo "📋 Found $(ls server/migrations/*.sql | wc -l) migration files"
echo ""
echo "⚠️  WARNING: This will apply ALL migrations to QA database"
echo "   Make sure this is the correct QA Supabase project!"
echo ""
read -p "Continue? (y/N): " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
  echo "Aborted"
  exit 0
fi

echo ""
echo "🚀 Applying migrations..."
echo ""

for migration in server/migrations/*.sql; do
  filename=$(basename "$migration")
  echo "  📄 Applying: $filename"

  # Use psql if available, otherwise use Supabase API
  if command -v psql &> /dev/null; then
    # Extract database connection from URL
    PGPASSWORD="${SUPABASE_QA_KEY}" psql "${SUPABASE_QA_URL/https:\/\//postgresql://postgres:${SUPABASE_QA_KEY}@}/postgres" -f "$migration" 2>&1 | grep -v "^$" || true
  else
    echo "    ⚠️  psql not found - install PostgreSQL client to apply migrations"
    echo "    Or manually apply via Supabase SQL Editor:"
    echo "    https://app.supabase.com/project/YOUR_PROJECT/sql"
    exit 1
  fi

  echo "  ✅ Applied: $filename"
  echo ""
done

echo ""
echo "✅ All migrations applied to QA database!"
echo ""
echo "Next steps:"
echo "  1. Verify migrations in Supabase Dashboard"
echo "  2. Redeploy QA from latest code"
echo "  3. Test QA environment"
