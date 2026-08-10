#!/usr/bin/env bash
# dev.sh — start Vite dev server with failsafe
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

exec npx vite --host 0.0.0.0 --port "$PORT"