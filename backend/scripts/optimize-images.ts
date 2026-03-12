/**
 * One-time script to generate responsive image variants for existing images.
 * Run with: npx tsx scripts/optimize-images.ts
 */
import sharp from 'sharp';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const uploadsRoot = path.join(__dirname, '../uploads');
const JPEG_QUALITY = 70;

interface Variant {
  suffix: string;
  width: number;
  height: number;
}

const PROFILE_VARIANTS: Variant[] = [
  { suffix: '',    width: 400, height: 400 },
  { suffix: '-md', width: 320, height: 320 },
  { suffix: '-sm', width: 96,  height: 96  },
];

const COVER_VARIANTS: Variant[] = [
  { suffix: '',    width: 1200, height: 600 },
  { suffix: '-sm', width: 600,  height: 300 },
];

function urlToFilePath(url: string): string | null {
  if (!url) return null;
  try {
    const urlPath = url.startsWith('http') ? new URL(url).pathname : url;
    return path.join(uploadsRoot, '..', urlPath);
  } catch {
    return null;
  }
}

function filePathToUrl(filePath: string): string {
  const relative = path.relative(path.join(uploadsRoot, '..'), filePath);
  return `${BACKEND_URL}/${relative}`;
}

async function generateVariants(filePath: string, variants: Variant[]): Promise<{ newFullPath: string; generated: number } | null> {
  if (!fs.existsSync(filePath)) {
    console.log(`  ⚠️  File not found: ${filePath}`);
    return null;
  }

  const dir = path.dirname(filePath);
  const baseName = path.basename(filePath).replace(/\.[^.]+$/, '');
  // Normalize baseName: strip any existing variant suffix
  const cleanBase = baseName.replace(/-(md|sm)$/, '');
  const oldSize = fs.statSync(filePath).size;

  let generated = 0;
  const sourceBuffer = fs.readFileSync(filePath);

  for (const variant of variants) {
    const outName = `${cleanBase}${variant.suffix}.jpg`;
    const outPath = path.join(dir, outName);

    const buffer = await sharp(sourceBuffer)
      .resize(variant.width, variant.height, { fit: 'cover' })
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer();

    fs.writeFileSync(outPath, buffer);
    generated++;

    if (variant.suffix === '') {
      console.log(`  ✅ ${variant.width}x${variant.height}: ${(oldSize / 1024).toFixed(0)}KB → ${(buffer.length / 1024).toFixed(0)}KB`);
    } else {
      console.log(`  ✅ ${variant.width}x${variant.height} (${variant.suffix}): ${(buffer.length / 1024).toFixed(0)}KB`);
    }
  }

  // Remove old non-jpg file if it was converted
  const newFullPath = path.join(dir, `${cleanBase}.jpg`);
  if (filePath !== newFullPath && fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  return { newFullPath, generated };
}

async function main() {
  console.log('🔧 Generating responsive image variants...\n');

  let totalGenerated = 0;

  // 1. User profile images
  console.log('── User Profile Images ──');
  const usersWithProfile = await prisma.user.findMany({
    where: { profileImage: { not: null } },
    select: { id: true, profileImage: true },
  });

  for (const user of usersWithProfile) {
    const filePath = urlToFilePath(user.profileImage!);
    if (!filePath) continue;
    console.log(`  Processing: ${path.basename(filePath)}`);

    const result = await generateVariants(filePath, PROFILE_VARIANTS);
    if (result) {
      const newUrl = filePathToUrl(result.newFullPath);
      if (newUrl !== user.profileImage) {
        await prisma.user.update({ where: { id: user.id }, data: { profileImage: newUrl } });
      }
      totalGenerated += result.generated;
    }
  }

  // 2. User cover images
  console.log('\n── User Cover Images ──');
  const usersWithCover = await prisma.user.findMany({
    where: { coverImage: { not: null } },
    select: { id: true, coverImage: true },
  });

  for (const user of usersWithCover) {
    const filePath = urlToFilePath(user.coverImage!);
    if (!filePath) continue;
    console.log(`  Processing: ${path.basename(filePath)}`);

    const result = await generateVariants(filePath, COVER_VARIANTS);
    if (result) {
      const newUrl = filePathToUrl(result.newFullPath);
      if (newUrl !== user.coverImage) {
        await prisma.user.update({ where: { id: user.id }, data: { coverImage: newUrl } });
      }
      totalGenerated += result.generated;
    }
  }

  // 3. Group profile images
  console.log('\n── Group Profile Images ──');
  const groupsWithProfile = await prisma.group.findMany({
    where: { profileImage: { not: null } },
    select: { id: true, profileImage: true },
  });

  for (const group of groupsWithProfile) {
    const filePath = urlToFilePath(group.profileImage!);
    if (!filePath) continue;
    console.log(`  Processing: ${path.basename(filePath)}`);

    const result = await generateVariants(filePath, PROFILE_VARIANTS);
    if (result) {
      const newUrl = filePathToUrl(result.newFullPath);
      if (newUrl !== group.profileImage) {
        await prisma.group.update({ where: { id: group.id }, data: { profileImage: newUrl } });
      }
      totalGenerated += result.generated;
    }
  }

  // 4. Group cover images
  console.log('\n── Group Cover Images ──');
  const groupsWithCover = await prisma.group.findMany({
    where: { coverImage: { not: null } },
    select: { id: true, coverImage: true },
  });

  for (const group of groupsWithCover) {
    const filePath = urlToFilePath(group.coverImage!);
    if (!filePath) continue;
    console.log(`  Processing: ${path.basename(filePath)}`);

    const result = await generateVariants(filePath, COVER_VARIANTS);
    if (result) {
      const newUrl = filePathToUrl(result.newFullPath);
      if (newUrl !== group.coverImage) {
        await prisma.group.update({ where: { id: group.id }, data: { coverImage: newUrl } });
      }
      totalGenerated += result.generated;
    }
  }

  console.log(`\n🎉 Done! Generated ${totalGenerated} image variants.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('❌ Error:', e);
  prisma.$disconnect();
  process.exit(1);
});
