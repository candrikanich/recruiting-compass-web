#!/bin/bash
set -e

if [ ! -f .output/public/index.html ]; then
  echo "ERROR: index.html not found! Creating it..."
  mkdir -p .output/public
  cat > .output/public/index.html << 'EOF'
<!DOCTYPE html>
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
</html>
EOF
  echo "Created index.html manually"
fi
