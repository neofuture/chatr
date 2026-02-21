#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const versionFile = path.join(__dirname, '..', 'src', 'version.ts');

// Read current version
const content = fs.readFileSync(versionFile, 'utf8');
const match = content.match(/export const version = '(\d+)\.(\d+)\.(\d+)'/);

if (!match) {
  console.error('Could not parse version from version.ts');
  process.exit(1);
}

const [, major, minor, patch] = match;
const newPatch = parseInt(patch, 10) + 1;
const newVersion = `${major}.${minor}.${newPatch}`;

// Write new version
const newContent = `export const version = '${newVersion}';\n`;
fs.writeFileSync(versionFile, newContent, 'utf8');

console.log(`Version updated: ${major}.${minor}.${patch} → ${newVersion}`);

