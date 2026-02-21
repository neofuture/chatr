#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const hookPath = path.join(__dirname, '..', '.git', 'hooks', 'post-commit');

const hookContent = `#!/bin/sh
# Skip if this is already a version bump commit (prevents infinite loop)
LAST_MSG=$(git log -1 --pretty=%s)
if [ "$LAST_MSG" = "chore: bump version" ]; then
  exit 0
fi

# Fix for GUI apps (GitHub Desktop) not loading PATH correctly
export PATH=$PATH:/usr/local/bin:/opt/homebrew/bin

cd "$(git rev-parse --show-toplevel)"
node frontend/scripts/increment-version.js
git add frontend/src/version.ts
git commit --no-verify -m "chore: bump version"
`;

try {
  fs.mkdirSync(path.dirname(hookPath), { recursive: true });
  fs.writeFileSync(hookPath, hookContent);
  fs.chmodSync(hookPath, '755');
  console.log('✅ post-commit hook installed');
} catch (e) {
  console.error('❌ Failed to install hook:', e.message);
}

