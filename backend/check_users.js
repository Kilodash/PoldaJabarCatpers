require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsers() {
    const users = await prisma.user.findMany({
        include: { satker: true }
    });
    console.log('--- PRISMA USERS ---');
    users.forEach(u => {
        console.log(`Email: ${u.email} | Role: ${u.role} | Satker: ${u.satker?.nama || 'None'}`);
    });
    console.log('--------------------');
    await prisma.$disconnect();
}

checkUsers().catch(console.error);
