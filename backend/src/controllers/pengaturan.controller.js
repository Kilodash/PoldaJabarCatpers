const prisma = require('../prisma');
const xlsx = require('xlsx');

const getAllPengaturan = async (req, res) => {
    try {
        const settings = await prisma.pengaturan.findMany();
        // Data pengaturan sangat jarang berubah — cache 120 detik
        res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=600');
        res.json(settings);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan saat memuat Pengaturan.' });
    }
};

const updatePengaturan = async (req, res) => {
    try {
        let { key } = req.params;
        let { value, deskripsi } = req.body;

        const setting = await prisma.pengaturan.upsert({
            where: { key },
            update: { value, deskripsi },
            create: { key, value, deskripsi }
        });

        await prisma.auditLog.create({
            data: {
                userId: req.user.id,
                aksi: 'UPDATE_PENGATURAN',
                targetId: null,
                deskripsi: `Mengubah parameter sistem "${key}" menjadi: "${value}"`,
                alasan: 'Update pengaturan sistem oleh Admin'
            }
        });

        res.json({ message: 'Pengaturan berhasil disimpan.', data: setting });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan saat menyimpan pengaturan.' });
    }
};

const getPengaturanByKey = async (req, res) => {
    try {
        const { key } = req.params;
        const setting = await prisma.pengaturan.findUnique({ where: { key } });
        if (!setting) return res.status(404).json({ message: 'Atribut pengaturan tidak ditemukan.' });
        res.json(setting);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
};

// --- EXPORT, TEMPLATE & IMPORT LOGIC ---

const downloadTemplate = async (req, res) => {
    try {
        const headers = [
            ['TEMPLATE IMPORT DATA PERSONEL & PELANGGARAN'],
            ['Petunjuk: Kolom dengan tanda (*) wajib diisi. Kolom tanggal gunakan format DD/MM/YYYY. Jangan mengubah urutan kolom.'],
            [],
            [
                'JENIS PEGAWAI (POLRI/PNS)*', 'NRP/NIP*', 'NAMA LENGKAP*', 'PANGKAT*', 'JABATAN*', 'SATKER/UNIT*', 'TANGGAL LAHIR*',
                'WUJUD PERBUATAN', 'JENIS DASAR PENCATATAN', 'NOMOR SURAT DASAR', 'TANGGAL SURAT DASAR', 'PANGKAT SAAT MELANGGAR',
                'JABATAN SAAT MELANGGAR', 'SATKER SAAT MELANGGAR', 'KETERANGAN DASAR',
                'STATUS PENYELESAIAN (PROSES/PERDAMAIAN/TIDAK_TERBUKTI_RIKSA/TIDAK_TERBUKTI_SIDANG/SIDANG)',
                'NOMOR SURAT SELESAI', 'TANGGAL SURAT SELESAI', 'KETERANGAN SELESAI',
                'NOMOR SP3', 'TANGGAL SP3', 'NOMOR SKTT', 'TANGGAL SKTT', 'NOMOR SKTB', 'TANGGAL SKTB',
                'JENIS SIDANG (DISIPLIN/KEPP)', 'BANDING (true/false)', 'NOMOR SKEP BANDING', 'TANGGAL SKEP BANDING',
                'HUKUMAN', 'NOMOR SKEP HUKUMAN', 'TANGGAL SKEP HUKUMAN', 'TANGGAL BISA AJUKAN RPS',
                'NOMOR REKOMENDASI', 'TANGGAL REKOMENDASI'
            ]
        ];

        const wb = xlsx.utils.book_new();
        const ws = xlsx.utils.aoa_to_sheet(headers);
        xlsx.utils.book_append_sheet(wb, ws, "Template");

        const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Disposition', 'attachment; filename=template_import_catpers_full.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Gagal membuat template.' });
    }
};

const exportData = async (req, res) => {
    try {
        const { satkerId } = req.query;
        const whereClause = { deletedAt: null };

        if (satkerId) {
            whereClause.satkerId = parseInt(satkerId);
        }

        const personnel = await prisma.personel.findMany({
            include: {
                satker: true,
                pelanggaran: { where: { deletedAt: null } }
            },
            where: whereClause
        });

        const data = personnel.map(p => {
            const latestViolation = p.pelanggaran && p.pelanggaran.length > 0
                ? p.pelanggaran.sort((a, b) => b.createdAt - a.createdAt)[0]
                : null;

            return {
                'Jenis Pegawai': p.jenisPegawai,
                'NRP/NIP': "'" + p.nrpNip,
                'Nama Lengkap': p.namaLengkap,
                'Pangkat': p.pangkat,
                'Jabatan': p.jabatan,
                'Satker': p.satker.nama,
                'Tanggal Lahir': p.tanggalLahir.toLocaleDateString('id-ID'),
                'Wujud Perbuatan': latestViolation && latestViolation.wujudPerbuatan ? latestViolation.wujudPerbuatan : '-',
                'Jenis Dasar Pencatatan': latestViolation && latestViolation.jenisDasar ? latestViolation.jenisDasar : '-',
                'Nomor Surat Dasar': latestViolation && latestViolation.nomorSurat ? latestViolation.nomorSurat : '-',
                'Pangkat Saat Melanggar': latestViolation && latestViolation.pangkatSaatMelanggar ? latestViolation.pangkatSaatMelanggar : '-',
                'Jabatan Saat Melanggar': latestViolation && latestViolation.jabatanSaatMelanggar ? latestViolation.jabatanSaatMelanggar : '-',
                'Satker Saat Melanggar': latestViolation && latestViolation.satkerSaatMelanggar ? latestViolation.satkerSaatMelanggar : '-',
                'Status Penyelesaian': latestViolation && latestViolation.statusPenyelesaian ? latestViolation.statusPenyelesaian : '-',
                'Jenis Sidang': latestViolation && latestViolation.jenisSidang ? latestViolation.jenisSidang : '-',
                'Hukuman': latestViolation && latestViolation.hukuman ? latestViolation.hukuman : '-',
                'Nomor Skep': latestViolation && latestViolation.nomorSkep ? latestViolation.nomorSkep : '-',
                'Nomor Rekomendasi': latestViolation && latestViolation.nomorRekomendasi ? latestViolation.nomorRekomendasi : '-',
                'Status Aktif': p.statusKeaktifan
            };
        });

        let satkerName = '';
        if (satkerId && personnel.length > 0) {
            satkerName = '_' + personnel[0].satker.nama.replace(/\s+/g, '_').toLowerCase();
        } else if (satkerId) {
            const s = await prisma.satker.findUnique({ where: { id: parseInt(satkerId) } });
            if (s) satkerName = '_' + s.nama.replace(/\s+/g, '_').toLowerCase();
        }

        const wb = xlsx.utils.book_new();
        const ws = xlsx.utils.json_to_sheet(data);
        xlsx.utils.book_append_sheet(wb, ws, "Data Personel");

        const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Disposition', `attachment; filename=export_personel${satkerName}_${Date.now()}.xlsx`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Gagal mengekspor data.' });
    }
};

const importData = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'File tidak ditemukan.' });

        const wb = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = wb.SheetNames[0];
        const rows = xlsx.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1 });

        const dataRows = rows.slice(4);
        let successCount = 0;
        let errorCount = 0;

        const pnsSetting = await prisma.pengaturan.findUnique({ where: { key: 'USIA_PENSIUN_PNS' } });
        const polriSetting = await prisma.pengaturan.findUnique({ where: { key: 'USIA_PENSIUN_POLRI' } });
        const usiaPensiunPNS = pnsSetting ? parseInt(pnsSetting.value) : 58;
        const usiaPensiunPolri = polriSetting ? parseInt(polriSetting.value) : 58;

        const parseD = (raw) => {
            if (!raw) return null;
            if (typeof raw === 'number') {
                const d = new Date((raw - (25567 + 1)) * 86400 * 1000);
                return isNaN(d) ? null : d;
            }
            const parts = String(raw).split('/');
            const d = parts.length === 3 ? new Date(parts[2], parts[1] - 1, parts[0]) : new Date(raw);
            return isNaN(d) ? null : d;
        };

        for (const row of dataRows) {
            if (!row || row.length < 3 || !row[1]) continue;

            try {
                const [
                    jenisPegawai, nrpNip, namaLengkap, pangkat, jabatan, satkerNama, tglLahirRaw,
                    wujud, jenisDasar, nomorSuratD, tglSuratDRaw, pangkatSaatL, jabatanSaatL, satkerSaatL, ketDasar,
                    statusSelesai, noSuratSelesai, tglSuratSelesaiRaw, ketSelesai,
                    noSp3, tglSp3Raw, noSktt, tglSkttRaw, noSktb, tglSktbRaw,
                    jenisSidang, banding, noSkepBanding, tglSkepBandingRaw,
                    hukuman, noSkepHukuman, tglSkepHukumanRaw, tglBisaRpsRaw,
                    noRekom, tglRekomRaw
                ] = row;

                let tglLahir = parseD(tglLahirRaw) || new Date('1980-01-01');

                const pensiunAge = String(jenisPegawai).toUpperCase() === 'PNS' ? usiaPensiunPNS : usiaPensiunPolri;
                const pensiunDate = new Date(tglLahir);
                pensiunDate.setFullYear(pensiunDate.getFullYear() + pensiunAge);

                await prisma.$transaction(async (tx) => {
                    let sNama = satkerNama ? String(satkerNama).trim() : 'Polda Jabar';
                    if (sNama.toLowerCase().includes('polda jabar') || sNama.toLowerCase() === 'polda' || sNama.toLowerCase() === 'mapolda' || sNama.toLowerCase() === 'polda jawa barat') {
                        sNama = 'Polda Jabar';
                    }

                    let satker = await tx.satker.findUnique({ where: { nama: sNama } });
                    if (!satker) satker = await tx.satker.create({ data: { nama: sNama } });

                    let personel = await tx.personel.findUnique({ where: { nrpNip: String(nrpNip) } });
                    if (!personel) {
                        personel = await tx.personel.create({
                            data: {
                                jenisPegawai: String(jenisPegawai).toUpperCase(),
                                nrpNip: String(nrpNip),
                                namaLengkap: String(namaLengkap),
                                pangkat: String(pangkat),
                                jabatan: String(jabatan),
                                satkerId: satker.id,
                                tanggalLahir: tglLahir,
                                tanggalPensiun: pensiunDate,
                                isDraft: false
                            }
                        });
                    }

                    if (wujud) {
                        await tx.pelanggaran.create({
                            data: {
                                personelId: personel.id,
                                wujudPerbuatan: String(wujud),
                                jenisDasar: jenisDasar ? String(jenisDasar) : 'Hasil Lidik Terbukti',
                                nomorSurat: nomorSuratD ? String(nomorSuratD) : `IMPORT-${Date.now()}`,
                                tanggalSurat: parseD(tglSuratDRaw),
                                pangkatSaatMelanggar: pangkatSaatL ? String(pangkatSaatL) : String(pangkat),
                                jabatanSaatMelanggar: jabatanSaatL ? String(jabatanSaatL) : String(jabatan),
                                satkerSaatMelanggar: satkerSaatL ? String(satkerSaatL) : sNama,
                                keteranganDasar: ketDasar ? String(ketDasar) : null,

                                statusPenyelesaian: statusSelesai ? String(statusSelesai) : 'PROSES',

                                nomorSuratSelesai: noSuratSelesai ? String(noSuratSelesai) : null,
                                tanggalSuratSelesai: parseD(tglSuratSelesaiRaw),
                                keteranganSelesai: ketSelesai ? String(ketSelesai) : null,

                                nomorSp3: noSp3 ? String(noSp3) : null,
                                tanggalSp3: parseD(tglSp3Raw),
                                nomorSktt: noSktt ? String(noSktt) : null,
                                tanggalSktt: parseD(tglSkttRaw),
                                nomorSktb: noSktb ? String(noSktb) : null,
                                tanggalSktb: parseD(tglSktbRaw),

                                jenisSidang: jenisSidang ? String(jenisSidang) : null,
                                banding: String(banding).toLowerCase() === 'true' ? 'true' : 'false',
                                nomorSkepBanding: noSkepBanding ? String(noSkepBanding) : null,
                                tanggalSkepBanding: parseD(tglSkepBandingRaw),
                                hukuman: hukuman ? String(hukuman) : null,
                                nomorSkep: noSkepHukuman ? String(noSkepHukuman) : null,
                                tanggalSkep: parseD(tglSkepHukumanRaw),
                                tanggalBisaAjukanRps: parseD(tglBisaRpsRaw),

                                nomorRekomendasi: noRekom ? String(noRekom) : null,
                                tanggalRekomendasi: parseD(tglRekomRaw),

                                isDraft: false
                            }
                        });
                    }

                    await tx.auditLog.create({
                        data: {
                            userId: req.user.id,
                            aksi: 'IMPORT_DATA',
                            targetId: personel.id,
                            deskripsi: `Impor data personel ${namaLengkap} format lebgkap`,
                            alasan: 'Impor masal via Excel'
                        }
                    });
                });
                successCount++;
            } catch (err) {
                console.error('Error importing row:', err);
                errorCount++;
            }
        }

        res.json({ message: `Impor selesai. Berhasil: ${successCount}, Gagal: ${errorCount}` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan saat memproses file.' });
    }
};

const scanPensiun = async (req, res) => {
    try {
        const pnsSetting = await prisma.pengaturan.findUnique({ where: { key: 'USIA_PENSIUN_PNS' } });
        const polriSetting = await prisma.pengaturan.findUnique({ where: { key: 'USIA_PENSIUN_POLRI' } });
        const usiaPensiunPNS = pnsSetting ? parseInt(pnsSetting.value) : 58;
        const usiaPensiunPolri = polriSetting ? parseInt(polriSetting.value) : 58;

        const now = new Date();

        // --- Metode tanggalLahir (fallback jika data tgl lahir benar) ---
        const pnsThresholdDate = new Date(now);
        pnsThresholdDate.setFullYear(now.getFullYear() - usiaPensiunPNS);

        const polriThresholdDate = new Date(now);
        polriThresholdDate.setFullYear(now.getFullYear() - usiaPensiunPolri);

        // --- Metode NRP prefix untuk POLRI ---
        // Format NRP POLRI: YYMMSSSS (2 digit tahun lahir, 2 digit bulan, 4 digit urut)
        // NRP 68xxxxxx = lahir 1968, NRP 00xxxxxx = lahir 2000 (abad 21)
        // Batas abad 21 (terlalu muda): NRP prefix 00 s/d (tahun sekarang % 100)
        // Abad 20 yang sudah pensiun: prefix 27 s/d cutoffYY (27 = safe lower bound abad 20)
        const polriCutoffYY = (now.getFullYear() - usiaPensiunPolri) % 100; // Misal: (2026-58)%100 = 68
        const nrpPrefixMax = String(polriCutoffYY).padStart(2, '0'); // '68'
        const nrpMinStr = '27000000'; // Batas bawah aman: NRP abad 20 (mulai 1927)
        const nrpMaxStr = nrpPrefixMax + '999999'; // '68999999'

        const potentialRetirees = await prisma.personel.findMany({
            where: {
                statusKeaktifan: 'AKTIF',
                deletedAt: null,
                isDraft: false,
                OR: [
                    // Metode 1: tanggalPensiun sudah lewat (paling akurat jika data benar)
                    { tanggalPensiun: { lte: now } },

                    // Metode 2: Deteksi NRP prefix untuk POLRI abad 20 yang sudah pensiun
                    // NRP '27xxxxxx' s/d '68xxxxxx' = lahir 1927-1968 = usia >= pension
                    // NRP '00xxxxxx' s/d '26xxxxxx' (abad 21) otomatis terkecualikan
                    {
                        jenisPegawai: 'POLRI',
                        nrpNip: { gte: nrpMinStr, lte: nrpMaxStr }
                    },

                    // Metode 3: tanggalLahir sebagai backup (untuk data dengan tgl lahir benar)
                    { jenisPegawai: 'PNS', tanggalLahir: { lte: pnsThresholdDate } },
                    { jenisPegawai: 'POLRI', tanggalLahir: { lte: polriThresholdDate } }
                ]
            },
            include: {
                satker: true
            },
            orderBy: { nrpNip: 'asc' }
        });

        res.json(potentialRetirees);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Gagal melakukan pemindaian pensiun.' });
    }
};

const bulkUpdatePensiun = async (req, res) => {
    try {
        const { ids, alasan } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: 'Data ID personel tidak valid.' });
        }

        await prisma.$transaction(async (tx) => {
            await tx.personel.updateMany({
                where: { id: { in: ids } },
                data: { statusKeaktifan: 'PENSIUN' }
            });

            // Log activity
            await tx.auditLog.create({
                data: {
                    userId: req.user.id,
                    aksi: 'BULK_UPDATE_PENSIUN',
                    deskripsi: `Memindahkan ${ids.length} personel ke kategori PENSIUN secara masal.`,
                    alasan: alasan || 'Pembersihan database personel pensiun.'
                }
            });
        });

        res.json({ message: `Berhasil memindahkan ${ids.length} anggota ke kategori PENSIUN.` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Gagal melakukan update pensiun masal.' });
    }
};

module.exports = {
    getAllPengaturan,
    updatePengaturan,
    getPengaturanByKey,
    downloadTemplate,
    exportData,
    importData,
    scanPensiun,
    bulkUpdatePensiun
};
