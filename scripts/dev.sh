#!/usr/bin/env bash
# dev.sh — start Vite dev server with failsafe + auto-version
set -euo pipefail

PORT=8080
cd "$(dirname "$0")/.."

# Kill anything already on the port
for pid in $(lsof -ti:$PORT 2>/dev/null || true); do
  kill -9 "$pid" 2>/dev/null && echo "Killed PID $pid on port $PORT"
done
sleep 0.5

# Remove stale TS-compiled .js files that shadow .ts source for Vite
find src -name '*.js' -type f -delete 2>/dev/null && echo "Cleaned stale src/**/*.js"

# Clear Vite's transform cache
rm -rf node_modules/.vite/

# Auto-tag: if the latest commit has no tag, create one so version badge stays current
LATEST_TAG=$(git tag --sort=-creatordate | head -1)
LATEST_COMMIT=$(git rev-parse HEAD)
TAG_COMMIT=$(git rev-list -1 "$LATEST_TAG" 2>/dev/null || true)

if [ "$LATEST_COMMIT" != "$TAG_COMMIT" ]; then
  # Calculate next patch version from latest tag
  if [ -n "$LATEST_TAG" ]; then
    NEXT=$(echo "$LATEST_TAG" | sed -E 's/v([0-9]+)\.([0-9]+)\.([0-9]+)/v\1.\2.'$(( 10#${3} + 1 ))'/')
  else
    NEXT="v1.0.0"
  fi
  echo "Auto-tagging HEAD as $NEXT (no tag on latest commit)"
  git tag -f "$NEXT"
fi

# Show resolved version
VERSION=$(git tag --sort=-creatordate | head -1)
echo "Version badge will show: $VERSION"

exec npx vite --host 0.0.0.0 --port "$PORT"