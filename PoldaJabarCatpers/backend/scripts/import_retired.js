const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const xlsx = require('xlsx');
const path = require('path');

async function importRetired() {
    console.log("Starting import...");
    const filePath = path.join(__dirname, '../uploads/template_import_catpers.xlsx');
    const wb = xlsx.readFile(filePath);
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];

    // Header is on row 4 (index 3) based on our previous template generation
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    const dataRows = rows.slice(4).filter(row => row && row[1]); // Ensure NRP/NIP exists

    let successCount = 0;
    let errorCount = 0;

    for (const row of dataRows) {
        try {
            const [
                jenisPegawai, nrpNip, namaLengkap, pangkat, jabatan,
                satkerNama, tglLahirRaw, wujud, dasarPencatatan, jenisSidang,
                hukuman, statusSelesai, tglRekomendasiRaw, keterangan
            ] = row;

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
            if (isNaN(tglLahir)) tglLahir = new Date('1980-01-01');

            let tanggalRekomendasi = null;
            if (tglRekomendasiRaw) {
                if (typeof tglRekomendasiRaw === 'number') {
                    tanggalRekomendasi = new Date((tglRekomendasiRaw - (25567 + 1)) * 86400 * 1000);
                } else {
                    const parts = String(tglRekomendasiRaw).split('/');
                    if (parts.length === 3) tanggalRekomendasi = new Date(parts[2], parts[1] - 1, parts[0]);
                }
                if (isNaN(tanggalRekomendasi)) tanggalRekomendasi = null;
            }

            // Calculation Date Pensiun (arbitrary for now, but valid date)
            const pensiunDate = new Date(); // They are already retired

            await prisma.$transaction(async (tx) => {
                // Determine Satker
                let finalSatkerNama = satkerNama || 'Polda Jabar (Default)';
                let satker = await tx.satker.findUnique({ where: { nama: finalSatkerNama } });
                if (!satker) satker = await tx.satker.create({ data: { nama: finalSatkerNama } });

                // Create/Update Personel with PENSIUN status
                let personel = await tx.personel.findUnique({ where: { nrpNip: String(nrpNip) } });

                if (!personel) {
                    personel = await tx.personel.create({
                        data: {
                            jenisPegawai: jenisPegawai || 'POLRI',
                            nrpNip: String(nrpNip),
                            namaLengkap: namaLengkap || '-',
                            pangkat: pangkat || '-',
                            jabatan: jabatan || '-',
                            satkerId: satker.id,
                            tanggalLahir: tglLahir,
                            tanggalPensiun: pensiunDate,
                            statusKeaktifan: 'PENSIUN',
                            isDraft: false
                        }
                    });
                } else {
                    personel = await tx.personel.update({
                        where: { id: personel.id },
                        data: { statusKeaktifan: 'PENSIUN' }
                    });
                }

                // Pelanggaran
                if (wujud && wujud !== '-') {
                    // check if already exists based on nrp and date approx, avoiding duplicates if run multiple times
                    // for simplicity, let's just create since we may wipe DB later or it's a fresh import
                    await tx.pelanggaran.create({
                        data: {
                            personelId: personel.id,
                            nomorSurat: 'IMPORT/AUTO/' + Date.now() + Math.floor(Math.random() * 1000),
                            tanggalSurat: new Date(),
                            wujudPerbuatan: wujud,
                            jenisDasar: dasarPencatatan !== '-' ? dasarPencatatan : null,
                            statusPenyelesaian: statusSelesai || 'SIDANG',
                            jenisSidang: jenisSidang || 'DISIPLIN',
                            hukuman: hukuman !== '-' ? hukuman : null,
                            tanggalRekomendasi: tanggalRekomendasi,
                            tanggalBisaAjukanRps: tanggalRekomendasi ? tanggalRekomendasi : null,
                            keteranganDasar: keterangan !== '-' ? keterangan : null,
                            isDraft: false
                        }
                    });
                }
            });
            successCount++;
        } catch (e) {
            console.error(`Row Error:`, e.message);
            errorCount++;
        }
    }

    console.log(`Import Complete! Berhasil: ${successCount}, Gagal: ${errorCount}`);
}

importRetired().catch(console.error).finally(() => prisma.$disconnect());
