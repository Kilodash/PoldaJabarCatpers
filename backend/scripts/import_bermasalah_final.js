const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const xlsx = require('xlsx');
const path = require('path');

async function importData() {
    console.log("Memulai proses impor data...");

    // 1. Ambil Satker yang ada agar tidak duplikat/buat baru
    const satkers = await prisma.satker.findMany();
    const findSatkerId = (name) => {
        if (!name) return satkers[0].id;
        const n = String(name).toUpperCase();
        for (const s of satkers) {
            if (s.nama.toUpperCase() === n) return s.id;
            if (n.includes(s.nama.toUpperCase().replace('POLRES ', '').replace('POLRESTA ', '').replace('POLRESTABES ', ''))) return s.id;
        }
        return satkers[0].id; // Default Polda Jabar
    };

    // 2. Baca file PERNAH BERMASALAH
    const fileBermasalah = path.join(__dirname, '../uploads/PERNAH BERMASALAH.xlsx');
    const wbB = xlsx.readFile(fileBermasalah);
    const rowsB = xlsx.utils.sheet_to_json(wbB.Sheets[wbB.SheetNames[0]], { header: 1 }).slice(4);

    console.log(`Memproses ${rowsB.length} baris dari file Bermasalah...`);

    for (const row of rowsB) {
        if (!row[1]) continue;
        try {
            const [jenis, nrpNip, nama, pangkat, jabatan, satker, tglLahirRaw, wujud, dasar, sidang, hukuman, status, tglRekomRaw, ket] = row;

            const nrp = String(nrpNip).replace(/\D/g, '');
            let tglLahir = new Date('1980-01-01');
            if (tglLahirRaw && typeof tglLahirRaw === 'number') {
                tglLahir = new Date((tglLahirRaw - (25567 + 1)) * 86400 * 1000);
            } else if (tglLahirRaw) {
                const p = String(tglLahirRaw).split('/');
                if (p.length === 3) tglLahir = new Date(p[2], p[1] - 1, p[0]);
            }

            let tglRekom = null;
            if (tglRekomRaw && typeof tglRekomRaw === 'number') {
                tglRekom = new Date((tglRekomRaw - (25567 + 1)) * 86400 * 1000);
            }

            await prisma.$transaction(async (tx) => {
                let p = await tx.personel.findUnique({ where: { nrpNip: nrp } });
                if (!p) {
                    p = await tx.personel.create({
                        data: {
                            jenisPegawai: jenis || 'POLRI',
                            nrpNip: nrp,
                            namaLengkap: nama || '-',
                            pangkat: pangkat || '-',
                            jabatan: jabatan || '-',
                            satkerId: findSatkerId(satker),
                            tanggalLahir: tglLahir,
                            tanggalPensiun: new Date(tglLahir.getFullYear() + 58, tglLahir.getMonth(), tglLahir.getDate()),
                            statusKeaktifan: 'AKTIF'
                        }
                    });
                }

                if (wujud) {
                    await tx.pelanggaran.create({
                        data: {
                            personelId: p.id,
                            nomorSurat: 'IMPORT-' + Date.now(),
                            tanggalSurat: new Date(),
                            wujudPerbuatan: wujud,
                            jenisDasar: dasar || null,
                            statusPenyelesaian: status || 'PROSES',
                            jenisSidang: sidang || 'DISIPLIN',
                            hukuman: hukuman || null,
                            tanggalRekomendasi: tglRekom,
                            tanggalBisaAjukanRps: tglRekom,
                            keteranganDasar: ket || null
                        }
                    });
                }
            });
        } catch (e) { console.error("Error row:", e); }
    }

    console.log("Impor selesai.");
}

importData().catch(console.error).finally(() => prisma.$disconnect());
