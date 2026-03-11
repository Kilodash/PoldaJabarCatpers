const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const xlsx = require('xlsx');
const path = require('path');

async function importPernahTercatat() {
    console.log("Starting import Pernah Tercatat...");
    const filePath = path.join(__dirname, '../uploads/template_import_catpers.xlsx');
    const wb = xlsx.readFile(filePath);
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];

    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    const dataRows = rows.slice(4).filter(row => row && row[1]);

    let successCount = 0;
    let errorCount = 0;

    const satkers = await prisma.satker.findMany();

    // Mapping function to find closest existing Satker
    const findSatkerId = (satkerName) => {
        if (!satkerName) return satkers.find(s => s.nama.includes('Polda'))?.id;

        const nameUpper = String(satkerName).toUpperCase();

        // Exact or explicit inclusion match
        for (const s of satkers) {
            if (s.nama.toUpperCase() === nameUpper) return s.id;
        }
        for (const s of satkers) {
            if (nameUpper.includes(s.nama.toUpperCase().replace('POLRESTA ', '').replace('POLRES ', '').replace('POLRESTABES ', ''))) {
                return s.id;
            }
        }

        // Default to Polda Jabar if not found
        return satkers.find(s => s.nama.includes('Polda'))?.id;
    };

    const pnsSetting = await prisma.pengaturan.findUnique({ where: { key: 'USIA_PENSIUN_PNS' } });
    const polriSetting = await prisma.pengaturan.findUnique({ where: { key: 'USIA_PENSIUN_POLRI' } });
    const usiaPensiunPNS = pnsSetting ? parseInt(pnsSetting.value) : 58;
    const usiaPensiunPolri = polriSetting ? parseInt(polriSetting.value) : 58;

    const currentDate = new Date();

    for (const row of dataRows) {
        try {
            const [
                jenisPegawai, nrpNip, namaLengkap, pangkat, jabatan,
                satkerNama, tglLahirRaw, wujud, dasarPencatatan, jenisSidang,
                hukuman, statusSelesai, tglRekomendasiRaw, keterangan
            ] = row;

            // NIP/NRP validation
            let nrp = String(nrpNip).replace(/\D/g, '');
            if (!nrp) continue; // Skip if totally invalid NRP

            // Date parsing
            let tglLahir = new Date('1980-01-01');
            if (tglLahirRaw) {
                if (typeof tglLahirRaw === 'number') {
                    tglLahir = new Date((tglLahirRaw - (25567 + 1)) * 86400 * 1000);
                } else {
                    const parts = String(tglLahirRaw).split('/');
                    if (parts.length === 3) tglLahir = new Date(parts[2], parts[1] - 1, parts[0]);
                }
            }
            if (isNaN(tglLahir) || tglLahir.getFullYear() > currentDate.getFullYear() || tglLahir.getFullYear() < 1940) {
                tglLahir = new Date('1980-01-01'); // fallback
            }

            // Calculation Date Pensiun
            const isPNS = jenisPegawai === 'PNS';
            const pensiunAge = isPNS ? usiaPensiunPNS : usiaPensiunPolri;
            const pensiunDate = new Date(tglLahir);
            pensiunDate.setFullYear(pensiunDate.getFullYear() + pensiunAge);

            const isRetired = currentDate.getTime() > pensiunDate.getTime();
            const statusPersonel = isRetired ? 'PENSIUN' : 'AKTIF';

            // Tanggal Rekomendasi processing - to make it 'Pernah Tercatat'
            let tanggalRekomendasi = new Date('2023-01-01'); // Force a date if none so it qualifies for Pernah Tercatat
            if (tglRekomendasiRaw && String(tglRekomendasiRaw).trim() !== '-' && tglRekomendasiRaw !== '') {
                if (typeof tglRekomendasiRaw === 'number') {
                    tanggalRekomendasi = new Date((tglRekomendasiRaw - (25567 + 1)) * 86400 * 1000);
                } else {
                    const parts = String(tglRekomendasiRaw).split('/');
                    if (parts.length === 3) tanggalRekomendasi = new Date(parts[2], parts[1] - 1, parts[0]);
                }
                if (isNaN(tanggalRekomendasi)) tanggalRekomendasi = new Date('2023-01-01');
            }

            // Status Penyelesaian - Force to SIDANG or MENJALANI_HUKUMAN for 'Pernah Tercatat'
            let finalStatusSelesai = statusSelesai;
            if (!['MENJALANI_HUKUMAN', 'SIDANG'].includes(finalStatusSelesai)) {
                finalStatusSelesai = 'SIDANG'; // Force it so it falls into Pernah Tercatat category
            }

            await prisma.$transaction(async (tx) => {
                const sId = findSatkerId(satkerNama);

                // Create/Update Personel
                let personel = await tx.personel.findUnique({ where: { nrpNip: nrp } });

                if (!personel) {
                    personel = await tx.personel.create({
                        data: {
                            jenisPegawai: jenisPegawai || 'POLRI',
                            nrpNip: nrp,
                            namaLengkap: namaLengkap || '-',
                            pangkat: pangkat || '-',
                            jabatan: jabatan || '-',
                            satkerId: sId,
                            tanggalLahir: tglLahir,
                            tanggalPensiun: pensiunDate,
                            statusKeaktifan: statusPersonel,
                            isDraft: false
                        }
                    });
                } else {
                    personel = await tx.personel.update({
                        where: { id: personel.id },
                        data: {
                            statusKeaktifan: statusPersonel,
                            tanggalLahir: tglLahir,
                            tanggalPensiun: pensiunDate,
                            satkerId: sId // Update if it was wrong
                        }
                    });
                }

                // Pelanggaran
                if (wujud && wujud !== '-') {
                    await tx.pelanggaran.create({
                        data: {
                            personelId: personel.id,
                            nomorSurat: 'IMPORT/' + Date.now() + Math.random().toString(36).substring(7),
                            tanggalSurat: new Date('2023-01-01'), // dummy date
                            wujudPerbuatan: wujud,
                            jenisDasar: dasarPencatatan !== '-' ? dasarPencatatan : null,
                            statusPenyelesaian: finalStatusSelesai,
                            jenisSidang: jenisSidang || 'DISIPLIN',
                            hukuman: hukuman !== '-' ? hukuman : null,
                            tanggalRekomendasi: tanggalRekomendasi,
                            tanggalBisaAjukanRps: new Date('2023-01-01'),
                            keteranganDasar: keterangan !== '-' ? keterangan : null,
                            isDraft: false
                        }
                    });
                }
            });
            successCount++;
        } catch (e) {
            console.error(`Row Error [${row[1]}]:`, e.message);
            errorCount++;
        }
    }

    console.log(`Import Complete! Berhasil: ${successCount}, Gagal: ${errorCount}`);
}

importPernahTercatat().catch(console.error).finally(() => prisma.$disconnect());
