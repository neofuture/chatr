#!/bin/bash

echo "🔧 Setting up Git hooks for version auto-increment..."
echo ""

# Check if we're in the repo root
if [ ! -d ".git" ]; then
    echo "❌ Error: Must be run from repository root (where .git folder is)"
    exit 1
fi

# Check if frontend directory exists
if [ ! -d "frontend" ]; then
    echo "❌ Error: frontend directory not found"
    exit 1
fi

# Check if increment script exists
if [ ! -f "frontend/scripts/increment-version.js" ]; then
    echo "❌ Error: frontend/scripts/increment-version.js not found"
    exit 1
fi

# Create post-commit hook
cat > .git/hooks/post-commit << 'EOF'
#!/bin/sh
cd frontend
node scripts/increment-version.js
git add src/version.ts
EOF

# Make it executable
chmod +x .git/hooks/post-commit

echo "✅ Git hook installed successfully!"
echo ""
echo "📍 Location: .git/hooks/post-commit"
echo "🎯 Function: Auto-increments version on every commit"
echo ""
echo "Test the hook with:"
echo "  .git/hooks/post-commit"
echo ""

