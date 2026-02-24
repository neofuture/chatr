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
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:3001 | xargs kill -9 2>/dev/null
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

# Start servers
(cd "$SCRIPT_DIR/backend" && npm run dev) &
BACKEND_PID=$!

(cd "$SCRIPT_DIR/frontend" && npm run dev) &
FRONTEND_PID=$!

(cd "$SCRIPT_DIR/backend" && npx prisma studio) &
PRISMA_PID=$!

(cd "$SCRIPT_DIR/frontend" && npx storybook dev -p 6006 --no-open > /tmp/storybook.log 2>&1 &)
STORYBOOK_PID=$!

echo ""
echo "✓ Servers started"
echo "  Frontend:  http://localhost:3000"
echo "  Backend:   http://localhost:3001"
echo "  API Docs:  http://localhost:3001/api/docs"
echo "  Database:  http://localhost:5555"
echo "  Storybook: http://localhost:6006 (logs: /tmp/storybook.log)"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Trap Ctrl+C
trap 'echo ""; echo "Stopping..."; kill $BACKEND_PID $FRONTEND_PID $PRISMA_PID 2>/dev/null; pkill -f "storybook dev" 2>/dev/null; echo "Stopping database containers..."; docker-compose down; exit 0' INT TERM

# Wait
wait $BACKEND_PID $FRONTEND_PID $PRISMA_PID
