const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function extractBirthDateFromNRPNIP(nrpNipRaw, isPns) {
    const nrp = String(nrpNipRaw).replace(/\D/g, '');
    let tglLahir = new Date('1980-01-01');

    if (isPns && nrp.length >= 18) {
        const y = nrp.substring(0, 4);
        const m = nrp.substring(4, 6);
        const d = nrp.substring(6, 8);
        tglLahir = new Date(`${y}-${m}-${d}`);
    } else if (!isPns && nrp.length >= 8) {
        const y = nrp.substring(0, 2);
        const m = nrp.substring(2, 4);
        let year = parseInt(y);
        let month = parseInt(m);
        year = year > 50 ? 1900 + year : 2000 + year;
        if (month > 0 && month <= 12) {
            tglLahir = new Date(`${year}-${month.toString().padStart(2, '0')}-01`);
        }
    }

    if (isNaN(tglLahir)) tglLahir = new Date('1980-01-01');
    return tglLahir;
}

async function scanAndRetire() {
    console.log("Memulai proses pemindaian Personel Pensiun...");

    // Fetch settings for calculations
    const pnsSetting = await prisma.pengaturan.findUnique({ where: { key: 'USIA_PENSIUN_PNS' } });
    const polriSetting = await prisma.pengaturan.findUnique({ where: { key: 'USIA_PENSIUN_POLRI' } });
    const usiaPensiunPNS = pnsSetting ? parseInt(pnsSetting.value) : 58;
    const usiaPensiunPolri = polriSetting ? parseInt(polriSetting.value) : 58;

    // We scan AKTIF personnel
    const activePersonel = await prisma.personel.findMany({
        where: {
            statusKeaktifan: 'AKTIF',
            deletedAt: null
        }
    });

    const currentDate = new Date();
    let updatedCount = 0;

    for (const p of activePersonel) {
        const isPns = p.jenisPegawai === 'PNS';
        const tglLahir = extractBirthDateFromNRPNIP(p.nrpNip, isPns);

        const pensiunAge = isPns ? usiaPensiunPNS : usiaPensiunPolri;

        const pensiunDate = new Date(tglLahir);
        pensiunDate.setFullYear(pensiunDate.getFullYear() + pensiunAge);

        // Let's set the retirement date to the END of the birth month of their retirement year.
        // Actually simple rule: if currentDate > pensiunDate, they are retired.
        if (currentDate.getTime() > pensiunDate.getTime()) {
            await prisma.personel.update({
                where: { id: p.id },
                data: {
                    statusKeaktifan: 'PENSIUN',
                    tanggalPensiun: pensiunDate // ensure the DB has the correct pensiun date
                }
            });
            console.log(`Pensiun: ${p.namaLengkap} (${p.nrpNip}) - Tgl Lahir: ${tglLahir.toLocaleDateString('id-ID')} -> Pensiun: ${pensiunDate.toLocaleDateString('id-ID')}`);
            updatedCount++;
        }
    }

    console.log(`\nSelesai! Berhasil mempensiunkan ${updatedCount} personel dari total ${activePersonel.length} personel aktif.`);
}

scanAndRetire().catch(console.error).finally(() => prisma.$disconnect());
