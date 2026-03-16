const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
    const email = process.argv[2] || 'admin@poldajabar.go.id';
    const password = process.argv[3] || 'admin123';

    console.log(`🚀 Seeding admin user: ${email}...`);

    try {
        // 1. Ensure Satker 1 exists (usually Polda Jabar)
        let satker = await prisma.satker.findFirst({
            where: { id: 1 }
        });

        if (!satker) {
            satker = await prisma.satker.create({
                data: {
                    id: 1,
                    nama: 'Polda Jabar',
                    urutan: 1
                }
            });
            console.log('✅ Created default Satker: Polda Jabar');
        }

        // 2. Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // 3. Create or Update Admin
        const user = await prisma.user.upsert({
            where: { email },
            update: {
                role: 'ADMIN_POLDA',
                satkerId: satker.id
            },
            create: {
                email,
                password: hashedPassword,
                displayName: 'Administrator',
                role: 'ADMIN_POLDA',
                satkerId: satker.id
            }
        });

        console.log('✨ Admin user initialized successfully!');
        console.log(`Email: ${user.email}`);
        console.log(`Role: ${user.role}`);
        console.log('--------------------------------------');
        console.log('PENTING: Pastikan email ini SAMA dengan email yang Anda gunakan login di Supabase.');

    } catch (error) {
        console.error('❌ Error seeding admin:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
