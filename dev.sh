#!/bin/bash

echo "🚀 Starting Chatr development servers..."
echo ""

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Kill existing processes
pkill -9 -f "npm run dev" 2>/dev/null
pkill -9 -f "next dev" 2>/dev/null
pkill -9 -f "tsx watch" 2>/dev/null
pkill -9 -f "prisma studio" 2>/dev/null
pkill -9 -f "storybook dev" 2>/dev/null
pkill -9 -f "widget-src/build.js" 2>/dev/null
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:3001 | xargs kill -9 2>/dev/null
lsof -ti:3002 | xargs kill -9 2>/dev/null
lsof -ti:5555 | xargs kill -9 2>/dev/null
lsof -ti:6006 | xargs kill -9 2>/dev/null
sleep 1

# Check Docker
if ! docker ps > /dev/null 2>&1; then
    echo "⚠️  Starting Docker..."
    colima start
    sleep 2
fi

# Start database containers
echo "🐘 Starting database containers..."
docker-compose up -d
echo "✓ Database containers started"
echo ""

# Wait for databases to be healthy
echo "⏳ Waiting for databases to be ready..."
for i in {1..30}; do
    if docker ps --filter "name=chatr_postgres" --filter "health=healthy" | grep -q chatr_postgres; then
        echo "✓ PostgreSQL is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "⚠️  Warning: PostgreSQL may not be ready yet"
    fi
    sleep 1
done
echo ""

# Apply any pending database migrations and regenerate client
(cd "$SCRIPT_DIR/backend" && npx prisma migrate deploy --skip-generate 2>/dev/null && npx prisma generate 2>/dev/null) || true

# Start servers
(cd "$SCRIPT_DIR/backend" && npm run dev) &
BACKEND_PID=$!

(cd "$SCRIPT_DIR/frontend" && npm run dev) &
FRONTEND_PID=$!

(cd "$SCRIPT_DIR/backend" && BROWSER=none npx prisma studio --browser none) &
PRISMA_PID=$!

(cd "$SCRIPT_DIR/frontend" && npx storybook dev -p 6006 --no-open > /tmp/storybook.log 2>&1 &)
STORYBOOK_PID=$!

(cd "$SCRIPT_DIR" && npm run widget:watch > /tmp/widget-watch.log 2>&1) &
WIDGET_PID=$!

# Dashboard cache invalidator — watches source dirs and pings the backend
# to clear cached metrics whenever files change
(
  sleep 5  # wait for backend to start
  if command -v fswatch &>/dev/null; then
    fswatch -r -l 2 --event Created --event Updated --event Removed \
      "$SCRIPT_DIR/frontend/src" "$SCRIPT_DIR/backend/src" "$SCRIPT_DIR/widget-src" 2>/dev/null | \
    while read -r _; do
      curl -s -X POST http://localhost:3001/api/dashboard/invalidate > /dev/null 2>&1
    done
  else
    while true; do
      sleep 30
      curl -s -X POST http://localhost:3001/api/dashboard/invalidate > /dev/null 2>&1
    done
  fi
) > /tmp/dashboard-watch.log 2>&1 &
DASHBOARD_PID=$!

LAN_IP=$(ipconfig getifaddr en0 2>/dev/null || echo "unknown")

echo ""
echo "✓ Servers started (HTTPS)"
echo "  Frontend:  https://localhost:3000"
echo "  Backend:   http://localhost:3001  (internal proxy)"
echo "             https://localhost:3002  (browser HTTPS)"
echo "  API Docs:  http://localhost:3001/api/docs"
echo "  Database:  http://localhost:5555"
echo "  Storybook: http://localhost:6006 (logs: /tmp/storybook.log)"
echo "  Widget:    watching widget-src/chatr.js (logs: /tmp/widget-watch.log)"
echo "  Dashboard: live metrics at https://localhost:3000/dashboard"
echo ""
echo "  📱 LAN:    https://${LAN_IP}:3000"
echo "  📱 LAN:    https://$(scutil --get LocalHostName 2>/dev/null || echo '?').local:3000"
echo ""
echo "Press Ctrl+C to stop"
echo ""

cleanup() {
  echo ""
  echo "🛑 Stopping all runners..."
  kill $BACKEND_PID $FRONTEND_PID $PRISMA_PID $WIDGET_PID $DASHBOARD_PID 2>/dev/null
  sleep 0.5
  pkill -9 -f "npm run dev" 2>/dev/null
  pkill -9 -f "next dev" 2>/dev/null
  pkill -9 -f "tsx watch" 2>/dev/null
  pkill -9 -f "prisma studio" 2>/dev/null
  pkill -9 -f "storybook dev" 2>/dev/null
  pkill -9 -f "widget-src/build.js" 2>/dev/null
  pkill -9 -f "fswatch.*chatr" 2>/dev/null
  pkill -9 -f "playwright test" 2>/dev/null
  lsof -ti:3000 | xargs kill -9 2>/dev/null
  lsof -ti:3001 | xargs kill -9 2>/dev/null
  lsof -ti:3002 | xargs kill -9 2>/dev/null
  lsof -ti:5555 | xargs kill -9 2>/dev/null
  lsof -ti:6006 | xargs kill -9 2>/dev/null
  echo "🐘 Stopping database containers..."
  docker-compose down
  echo "✅ All stopped."
  exit 0
}
trap cleanup INT TERM

# Wait
wait $BACKEND_PID $FRONTEND_PID $PRISMA_PID $WIDGET_PID
