#!/usr/bin/env bash
# dev.sh — start Vite dev server with port 8080 failsafe
set -euo pipefail

PORT=8080
cd "$(dirname "$0")"

# Kill anything already on the port
for pid in $(lsof -ti:$PORT 2>/dev/null || true); do
  kill -9 "$pid" 2>/dev/null && echo "Killed PID $pid on port $PORT"
done
sleep 0.5

exec npx vite --host 0.0.0.0 --port "$PORT"