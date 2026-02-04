#!/bin/bash
# Deploy to Staging via GitHub API
# Usage: ./deploy-staging.sh

GITHUB_TOKEN="${GITHUB_TOKEN:-}"
REPO="candrikanich/recruiting-compass-web"
BRANCH="develop"
WORKFLOW="manual-deploy.yml"

if [ -z "$GITHUB_TOKEN" ]; then
  echo "❌ Error: GITHUB_TOKEN environment variable not set"
  echo "Set it with: export GITHUB_TOKEN=your_github_token"
  exit 1
fi

echo "🚀 Triggering deployment to staging..."

curl -X POST \
  -H "Accept: application/vnd.github.v3+json" \
  -H "Authorization: token $GITHUB_TOKEN" \
  "https://api.github.com/repos/$REPO/actions/workflows/$WORKFLOW/dispatches" \
  -d "{\"ref\":\"$BRANCH\"}"

echo ""
echo "✅ Deployment triggered!"
echo "View at: https://github.com/$REPO/actions"
