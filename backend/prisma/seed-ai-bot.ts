/**
 * Seeds only the Luna AI bot USER into the database.
 * Does NOT create any conversations — those are created on-demand when a user first messages the bot.
 *
 * Run with: npx ts-node -r tsconfig-paths/register --project tsconfig.seed.json prisma/seed-ai-bot.ts
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const BOT_USERNAME = '@luna';
const BOT_DISPLAY_NAME = 'Luna';
const BOT_PASSWORD = `bot-${Date.now()}-${Math.random().toString(36).slice(2)}`; // random, not usable to login

async function main() {
  console.log('🤖 Seeding Luna AI bot user...');

  const hashedPassword = await bcrypt.hash(BOT_PASSWORD, 12);

  // Upsert the bot user
  const bot = await prisma.user.upsert({
    where: { username: BOT_USERNAME },
    create: {
      username: BOT_USERNAME,
      displayName: BOT_DISPLAY_NAME,
      password: hashedPassword,
      emailVerified: true,
      phoneVerified: false,
      isBot: true,
      showOnlineStatus: true,
    },
    update: {
      displayName: BOT_DISPLAY_NAME,
      isBot: true,
    },
    select: { id: true, username: true, displayName: true, isBot: true },
  });

  console.log(`✅ AI bot created/updated: ${bot.username} (${bot.id})`);
  console.log(`\n🔑 Bot User ID: ${bot.id}`);
  console.log('Add this to your .env as:');
  console.log(`  AI_BOT_USER_ID=${bot.id}`);
  console.log('And to frontend .env.local as:');
  console.log(`  NEXT_PUBLIC_AI_BOT_USER_ID=${bot.id}`);
  console.log('\n✨ Conversations are created on-demand — no seeding needed!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

