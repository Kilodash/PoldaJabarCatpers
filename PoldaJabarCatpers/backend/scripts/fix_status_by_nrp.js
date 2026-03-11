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

async function fixStatusByNRP() {
    console.log("Memulai proses perbaikan status berdasarkan NRP/NIP...");

    // Fetch settings for calculations
    const pnsSetting = await prisma.pengaturan.findUnique({ where: { key: 'USIA_PENSIUN_PNS' } });
    const polriSetting = await prisma.pengaturan.findUnique({ where: { key: 'USIA_PENSIUN_POLRI' } });
    const usiaPensiunPNS = pnsSetting ? parseInt(pnsSetting.value) : 58;
    const usiaPensiunPolri = polriSetting ? parseInt(polriSetting.value) : 58;

    // Scan ALL personnel (excluding deleted)
    const allPersonel = await prisma.personel.findMany({
        where: { deletedAt: null }
    });

    const currentDate = new Date();
    let madePensiunCount = 0;
    let madeAktifCount = 0;

    for (const p of allPersonel) {
        const isPns = p.jenisPegawai === 'PNS';
        const tglLahir = extractBirthDateFromNRPNIP(p.nrpNip, isPns);

        const pensiunAge = isPns ? usiaPensiunPNS : usiaPensiunPolri;

        const pensiunDate = new Date(tglLahir);
        pensiunDate.setFullYear(pensiunDate.getFullYear() + pensiunAge);

        const isRetired = currentDate.getTime() > pensiunDate.getTime();
        const correctStatus = isRetired ? 'PENSIUN' : 'AKTIF';

        if (p.statusKeaktifan !== correctStatus && p.statusKeaktifan !== 'DIHAPUS' && p.statusKeaktifan !== 'MENINGGAL_DUNIA') {
            await prisma.personel.update({
                where: { id: p.id },
                data: {
                    statusKeaktifan: correctStatus,
                    tanggalLahir: tglLahir, // Fix birthdate as well if it was incorrect
                    tanggalPensiun: pensiunDate // Fix pensiun date
                }
            });
            if (correctStatus === 'PENSIUN') {
                madePensiunCount++;
            } else {
                madeAktifCount++;
            }
        }
    }

    console.log(`Selesai! Berhasil mengubah ${madePensiunCount} menjadi PENSIUN dan ${madeAktifCount} menjadi AKTIF dari total ${allPersonel.length} personel.`);
}

fixStatusByNRP().catch(console.error).finally(() => prisma.$disconnect());
