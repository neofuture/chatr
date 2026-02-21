#!/usr/bin/env node

/**
 * Cleanup Old Profile and Cover Images
 *
 * This script removes duplicate profile/cover images for the same user,
 * keeping only the most recent one based on timestamp in filename.
 */

const fs = require('fs');
const path = require('path');

const profilesDir = path.join(__dirname, '../../uploads/profiles');
const coversDir = path.join(__dirname, '../../uploads/covers');

function cleanupDirectory(dir, type) {
  console.log(`\n🧹 Cleaning up ${type} images in: ${dir}`);

  if (!fs.existsSync(dir)) {
    console.log(`⚠️  Directory does not exist: ${dir}`);
    return;
  }

  const files = fs.readdirSync(dir);

  // Group files by userId
  const filesByUser = {};

  files.forEach(filename => {
    if (filename.startsWith('.')) return; // Skip hidden files

    // Extract userId from filename (format: userId-timestamp.ext)
    const match = filename.match(/^([a-f0-9-]+)-(\d+)\./);
    if (match) {
      const userId = match[1];
      const timestamp = parseInt(match[2]);

      if (!filesByUser[userId]) {
        filesByUser[userId] = [];
      }

      filesByUser[userId].push({
        filename,
        timestamp,
        path: path.join(dir, filename),
      });
    }
  });

  // For each user, keep only the most recent file
  let deletedCount = 0;
  let keptCount = 0;

  Object.entries(filesByUser).forEach(([userId, userFiles]) => {
    if (userFiles.length <= 1) {
      keptCount += userFiles.length;
      return; // Only one file, nothing to clean
    }

    // Sort by timestamp (newest first)
    userFiles.sort((a, b) => b.timestamp - a.timestamp);

    const newest = userFiles[0];
    const oldFiles = userFiles.slice(1);

    console.log(`\n👤 User: ${userId}`);
    console.log(`  ✅ Keeping: ${newest.filename} (${new Date(newest.timestamp).toISOString()})`);

    oldFiles.forEach(oldFile => {
      try {
        fs.unlinkSync(oldFile.path);
        console.log(`  🗑️  Deleted: ${oldFile.filename} (${new Date(oldFile.timestamp).toISOString()})`);
        deletedCount++;
      } catch (err) {
        console.error(`  ❌ Failed to delete ${oldFile.filename}:`, err.message);
      }
    });

    keptCount++;
  });

  console.log(`\n📊 ${type} Summary:`);
  console.log(`  - Files kept: ${keptCount}`);
  console.log(`  - Files deleted: ${deletedCount}`);
}

// Run cleanup
console.log('🚀 Starting image cleanup...');
cleanupDirectory(profilesDir, 'Profile');
cleanupDirectory(coversDir, 'Cover');
console.log('\n✅ Cleanup complete!\n');

