// Quick script to check database and create test user if needed
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const prisma = new PrismaClient();

async function checkAndCreateUser() {
  console.log('🔍 Checking database for users...\n');

  // Check existing users
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      emailVerified: true,
      phoneVerified: true,
    },
    take: 10,
  });

  console.log(`Found ${users.length} user(s) in database:\n`);

  if (users.length > 0) {
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Email Verified: ${user.emailVerified ? '✅' : '❌'}`);
      console.log(`   Phone Verified: ${user.phoneVerified ? '✅' : '❌'}`);
      console.log(`   ID: ${user.id}`);
      console.log();
    });
  } else {
    console.log('❌ No users found in database!\n');
    console.log('Creating test user...\n');

    const hashedPassword = await bcrypt.hash('Test123!', 10);

    const testUser = await prisma.user.create({
      data: {
        email: 'test@test.com',
        username: '@testuser',
        password: hashedPassword,
        emailVerified: true,
        phoneVerified: true,
      },
    });

    console.log('✅ Test user created!');
    console.log(`   Email: test@test.com`);
    console.log(`   Password: Test123!`);
    console.log(`   Username: @testuser`);
    console.log(`   ID: ${testUser.id}`);
    console.log('\n🎉 You can now login with these credentials!');
  }

  await prisma.$disconnect();
}

checkAndCreateUser().catch(console.error);

