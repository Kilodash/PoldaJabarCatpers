const prisma = require('./src/prisma');

async function test() {
    try {
        const res = await prisma.personel.findMany({
            where: {
                AND: [
                    {
                        OR: [
                            { namaLengkap: { contains: 'budi' } },
                            { nrpNip: { contains: 'budi' } },
                            { pangkat: { contains: 'budi' } },
                            { jabatan: { contains: 'budi' } }
                        ]
                    }
                ]
            }
        });
        console.log("Success! Found:", res.length);
    } catch (err) {
        console.error("Prisma error:", err);
    } finally {
        await prisma.$disconnect();
    }
}

test();
