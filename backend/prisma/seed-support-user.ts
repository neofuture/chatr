import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SUPPORT_AGENT_EMAIL || 'carlfearby@me.com';

  const user = await prisma.user.findFirst({ where: { email } });
  if (!user) {
    console.error(`❌ User with email ${email} not found`);
    process.exit(1);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { isSupport: true },
  });

  console.log(`✅ Marked ${email} (${user.displayName || user.username}) as support agent`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

