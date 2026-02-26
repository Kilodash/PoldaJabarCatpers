const prisma = require('../prisma');

// Helper untuk format path file (menghilangkan prefix path lokal agar bisa diakses lewat URL)
const formatFilePath = (file) => {
    return file ? `/uploads/${file.filename}` : null;
};

// Validasi Akses Operator ke Personel
const checkOperatorAccess = async (req, personelId) => {
    const personel = await prisma.personel.findUnique({ where: { id: personelId } });
    if (!personel) return { allowed: false, message: 'Personel tidak ditemukan.' };

    if (req.user.role === 'OPERATOR_SATKER' && personel.satkerId !== req.user.satkerId) {
        return { allowed: false, message: 'Anda tidak memiliki hak akses ke personel Satker lain.' };
    }
    return { allowed: true, personel };
}

// Tambah Pelanggaran
const createPelanggaran = async (req, res) => {
    try {
        const {
            personelId, jenisDasar, nomorSurat, tanggalSurat, wujudPerbuatan, keteranganDasar,
            jenisSidang, hukuman, banding, statusPenyelesaian,
            nomorSuratSelesai, tanggalSuratSelesai, keteranganSelesai, tanggalRekomendasi,
            nomorSkep, tanggalSkep, nomorRekomendasi, tanggalBisaAjukanRps
        } = req.body;

        // Cek Akses
        const access = await checkOperatorAccess(req, personelId);
        if (!access.allowed) return res.status(access.statusCode || 403).json({ message: access.message });

        // Handle File Dasar
        const fileDasar = req.files?.fileDasar ? req.files.fileDasar[0] : null;
        let fileDasarUrl = formatFilePath(fileDasar);

        // Jika status MENJALANI_HUKUMAN dan ini dari sidang, bisa ada fileSelesai (Surat Putusan Hukuman)
        const fileSelesai = req.files?.fileSelesai ? req.files.fileSelesai[0] : null;
        let fileSelesaiUrl = formatFilePath(fileSelesai);

        const filePutusan = req.files?.filePutusan ? req.files.filePutusan[0] : null;
        let filePutusanUrl = formatFilePath(filePutusan);

        const fileRekomendasi = req.files?.fileRekomendasi ? req.files.fileRekomendasi[0] : null;
        let fileRekomendasiUrl = formatFilePath(fileRekomendasi);

        // Parsing boolean & date
        const isBanding = banding === 'true' || banding === true;
        const tglSuratObj = new Date(tanggalSurat);
        const tglSelesaiObj = tanggalSuratSelesai ? new Date(tanggalSuratSelesai) : null;
        const tglRekomendasiObj = tanggalRekomendasi ? new Date(tanggalRekomendasi) : null;
        const tglSkepObj = tanggalSkep ? new Date(tanggalSkep) : null;
        const tglBisaAjukanRpsObj = tanggalBisaAjukanRps ? new Date(tanggalBisaAjukanRps) : null;

        const pelanggaran = await prisma.pelanggaran.create({
            data: {
                personelId,
                jenisDasar: jenisDasar || null,
                nomorSurat,
                tanggalSurat: tglSuratObj,
                wujudPerbuatan,
                keteranganDasar,
                fileDasarUrl,
                jenisSidang: jenisSidang || null,
                hukuman: hukuman || null,
                banding: isBanding,
                statusPenyelesaian,
                nomorSuratSelesai: nomorSuratSelesai || null,
                tanggalSuratSelesai: tglSelesaiObj,
                keteranganSelesai: keteranganSelesai || null,
                fileSelesaiUrl,
                filePutusanUrl,
                tanggalRekomendasi: tglRekomendasiObj,
                nomorSkep: nomorSkep || null,
                tanggalSkep: tglSkepObj,
                nomorRekomendasi: nomorRekomendasi || null,
                tanggalBisaAjukanRps: tglBisaAjukanRpsObj,
                fileRekomendasiUrl
            }
        });

        res.status(201).json({ message: 'Catatan pelanggaran ditambahkan', data: pelanggaran });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
};

// Update Pelanggaran (misalnya update status penyelesaian)
const updatePelanggaran = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            statusPenyelesaian, nomorSuratSelesai, tanggalSuratSelesai, keteranganSelesai, tanggalRekomendasi,
            jenisDasar, nomorSurat, tanggalSurat, wujudPerbuatan, keteranganDasar,
            jenisSidang, hukuman, banding,
            nomorSkep, tanggalSkep, nomorRekomendasi, tanggalBisaAjukanRps
        } = req.body;

        const existingCatpers = await prisma.pelanggaran.findUnique({ where: { id } });
        if (!existingCatpers) return res.status(404).json({ message: 'Data tidak ditemukan' });

        // Cek Akses
        const access = await checkOperatorAccess(req, existingCatpers.personelId);
        if (!access.allowed) return res.status(access.statusCode || 403).json({ message: access.message });

        // Menangani file upload opsional saat update (misal mengunggah surat putusan di kemudian hari)
        const fileSelesai = req.files?.fileSelesai ? req.files.fileSelesai[0] : null;
        let fileSelesaiUrl = existingCatpers.fileSelesaiUrl;

        if (fileSelesai) {
            fileSelesaiUrl = formatFilePath(fileSelesai);
            // TODO: Hapus file lama jika ada (optimasi di masa depan)
        }

        const filePutusan = req.files?.filePutusan ? req.files.filePutusan[0] : null;
        let filePutusanUrl = existingCatpers.filePutusanUrl;

        if (filePutusan) {
            filePutusanUrl = formatFilePath(filePutusan);
        }

        const fileRekomendasi = req.files?.fileRekomendasi ? req.files.fileRekomendasi[0] : null;
        let fileRekomendasiUrl = existingCatpers.fileRekomendasiUrl;
        if (fileRekomendasi) {
            fileRekomendasiUrl = formatFilePath(fileRekomendasi);
        }

        const tglSuratObj = tanggalSurat ? new Date(tanggalSurat) : existingCatpers.tanggalSurat;

        const tglSelesaiObj = tanggalSuratSelesai ? new Date(tanggalSuratSelesai) : existingCatpers.tanggalSuratSelesai;
        const tglRekomendasiObj = tanggalRekomendasi ? new Date(tanggalRekomendasi) : existingCatpers.tanggalRekomendasi;
        const tglSkepObj = tanggalSkep ? new Date(tanggalSkep) : existingCatpers.tanggalSkep;
        const tglBisaAjukanRpsObj = tanggalBisaAjukanRps ? new Date(tanggalBisaAjukanRps) : existingCatpers.tanggalBisaAjukanRps;
        const isBanding = banding !== undefined ? (banding === 'true' || banding === true) : existingCatpers.banding;

        const pelanggaran = await prisma.pelanggaran.update({
            where: { id },
            data: {
                jenisDasar: jenisDasar || existingCatpers.jenisDasar,
                nomorSurat: nomorSurat || existingCatpers.nomorSurat,
                tanggalSurat: tglSuratObj,
                wujudPerbuatan: wujudPerbuatan || existingCatpers.wujudPerbuatan,
                keteranganDasar: keteranganDasar || existingCatpers.keteranganDasar,
                statusPenyelesaian: statusPenyelesaian || existingCatpers.statusPenyelesaian,
                nomorSuratSelesai: nomorSuratSelesai || existingCatpers.nomorSuratSelesai,
                tanggalSuratSelesai: tglSelesaiObj,
                keteranganSelesai: keteranganSelesai || existingCatpers.keteranganSelesai,
                fileSelesaiUrl,
                filePutusanUrl,
                tanggalRekomendasi: tglRekomendasiObj,
                jenisSidang: jenisSidang === '' ? null : (jenisSidang || existingCatpers.jenisSidang),
                hukuman: hukuman || existingCatpers.hukuman,
                banding: isBanding,
                nomorSkep: nomorSkep || existingCatpers.nomorSkep,
                tanggalSkep: tglSkepObj,
                nomorRekomendasi: nomorRekomendasi || existingCatpers.nomorRekomendasi,
                tanggalBisaAjukanRps: tglBisaAjukanRpsObj,
                fileRekomendasiUrl
            }
        });

        res.json({ message: 'Catatan pelanggaran diperbarui', data: pelanggaran });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
}

// Get Detail Pelanggaran
const getPelanggaranById = async (req, res) => {
    try {
        const { id } = req.params;
        const pelanggaran = await prisma.pelanggaran.findUnique({
            where: { id },
            include: { personel: { include: { satker: true } } }
        });

        if (!pelanggaran) return res.status(404).json({ message: 'Catatan tidak ditemukan' });

        // Cek Akses Operator
        if (req.user.role === 'OPERATOR_SATKER' && pelanggaran.personel.satkerId !== req.user.satkerId) {
            return res.status(403).json({ message: 'Akses ditolak.' });
        }

        res.json(pelanggaran);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
};

const deletePelanggaran = async (req, res) => {
    try {
        const { id } = req.params;
        const { alasan } = req.body;

        const existingCatpers = await prisma.pelanggaran.findUnique({ where: { id } });
        if (!existingCatpers) return res.status(404).json({ message: 'Data tidak ditemukan' });

        // Cek Akses
        const access = await checkOperatorAccess(req, existingCatpers.personelId);
        if (!access.allowed) return res.status(access.statusCode || 403).json({ message: access.message });

        await prisma.$transaction([
            prisma.pelanggaran.update({
                where: { id },
                data: { deletedAt: new Date() }
            }),
            prisma.auditLog.create({
                data: {
                    userId: req.user.id,
                    aksi: 'DELETE_PELANGGARAN',
                    targetId: id,
                    deskripsi: `Menghapus catatan pelanggaran ID ${id}`,
                    alasan: alasan || 'Dihapus oleh admin'
                }
            })
        ]);

        res.json({ message: 'Catatan pelanggaran berhasil dihapus.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
}

module.exports = {
    createPelanggaran,
    updatePelanggaran,
    getPelanggaranById,
    deletePelanggaran
};
