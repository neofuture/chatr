// Debug script to verify JWT token and user existence
// Run with: node src/scripts/debug-websocket-auth.js

const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function debugAuth() {
  console.log('🔍 WebSocket Authentication Debugger\n');

  // Check JWT_SECRET
  const jwtSecret = process.env.JWT_SECRET;
  console.log('1. JWT_SECRET:', jwtSecret ? '✅ Set' : '❌ Not set');
  console.log(`   Value: ${jwtSecret}\n`);

  // Get token from command line or prompt user
  const token = process.argv[2];

  if (!token) {
    console.log('❌ No token provided');
    console.log('\nUsage:');
    console.log('  node src/scripts/debug-websocket-auth.js YOUR_JWT_TOKEN');
    console.log('\nOr in browser console, copy your token:');
    console.log('  localStorage.getItem("token")');
    process.exit(1);
  }

  console.log('2. Token received:', token.substring(0, 50) + '...\n');

  // Try to decode token
  try {
    console.log('3. Decoding token...');
    const decoded = jwt.verify(token, jwtSecret);
    console.log('   ✅ Token is valid');
    console.log('   User ID:', decoded.userId);
    console.log('   Issued at:', new Date(decoded.iat * 1000).toISOString());
    console.log('   Expires at:', decoded.exp ? new Date(decoded.exp * 1000).toISOString() : 'Never');
    console.log();

    // Check if user exists
    console.log('4. Checking if user exists in database...');
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
      }
    });

    if (user) {
      console.log('   ✅ User found in database!');
      console.log('   ID:', user.id);
      console.log('   Username:', user.username);
      console.log('   Email:', user.email);
      console.log('   Created:', user.createdAt.toISOString());
      console.log('\n✅ AUTHENTICATION SHOULD WORK!');
    } else {
      console.log('   ❌ User NOT found in database');
      console.log('   User ID from token:', decoded.userId);
      console.log('\n❌ THIS IS THE PROBLEM!');
      console.log('   The token is valid but the user was deleted.');
      console.log('   Solution: Logout and login again to get a new token.');
    }

  } catch (error) {
    console.log('   ❌ Token verification failed');
    console.log('   Error:', error.message);

    if (error.message.includes('jwt expired')) {
      console.log('\n❌ TOKEN HAS EXPIRED');
      console.log('   Solution: Logout and login again.');
    } else if (error.message.includes('invalid signature')) {
      console.log('\n❌ JWT_SECRET MISMATCH');
      console.log('   The token was created with a different JWT_SECRET.');
      console.log('   Solution: Logout and login again, or check JWT_SECRET in .env');
    } else {
      console.log('\n❌ INVALID TOKEN');
      console.log('   Solution: Logout and login again.');
    }
  }

  await prisma.$disconnect();
}

debugAuth().catch(console.error);

