const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function check() {
  console.log('--- DIAGNOSTIC START ---');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('DATABASE_URL defined:', !!process.env.DATABASE_URL);
  
  try {
    const start = Date.now();
    await prisma.$connect();
    console.log('Database connected in', Date.now() - start, 'ms');
    
    const userCount = await prisma.user.count();
    console.log('Total users in DB:', userCount);
    
    const sampleUser = await prisma.user.findFirst();
    console.log('Sample user found:', !!sampleUser);
    
    await prisma.$disconnect();
    console.log('Database disconnected successfully');
  } catch (error) {
    console.error('DIAGNOSTIC FAILED:');
    console.error('Error Code:', error.code);
    console.error('Error Message:', error.message);
    if (error.meta) console.error('Error Meta:', error.meta);
  } finally {
    process.exit();
  }
}

check();
