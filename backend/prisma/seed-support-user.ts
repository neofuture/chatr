import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SUPPORT_AGENT_EMAIL || 'carlfearby@me.com';

  const rows = await prisma.$queryRaw<{ id: string; displayName: string | null; username: string }[]>`
    SELECT id, "displayName", username FROM "User" WHERE email = ${email} LIMIT 1
  `;

  if (!rows.length) {
    console.error(`❌ User with email ${email} not found`);
    process.exit(1);
  }

  const user = rows[0];

  await prisma.$executeRaw`UPDATE "User" SET "isSupport" = true WHERE id = ${user.id}`;

  console.log(`✅ Marked ${email} (${user.displayName || user.username}) as support agent`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

