const prisma = require('../prisma');
const { uploadFileToSupabase, deleteFileFromSupabase } = require('../utils/supabaseStorage');

// Helper untuk format/upload array file dari memory (buffer) ke Supabase Storage
const uploadMultipleFiles = async (filesArray, folderName = 'pelanggaran') => {
    if (!filesArray || filesArray.length === 0) return null;
    const uploadPromises = filesArray.map(file => uploadFileToSupabase(file, folderName));
    const urls = await Promise.all(uploadPromises);
    return urls.join(',');
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
            nomorSkep, tanggalSkep, nomorRekomendasi, tanggalBisaAjukanRps,
            pangkatSaatMelanggar, satkerSaatMelanggar, jabatanSaatMelanggar,
            nomorSktt, tanggalSktt, nomorSktb, tanggalSktb,
            nomorSp3, tanggalSp3
        } = req.body;
        const access = await checkOperatorAccess(req, personelId);
        if (!access.allowed) return res.status(access.statusCode || 403).json({ message: access.message });

        // Handle Multiple Files using Supabase or Direct URLs
        // Format: req.body.fileField can be a comma-separated string of URLs from direct upload
        const getFileUrls = async (filesArray, bodyUrl, folderName) => {
            if (bodyUrl) return bodyUrl; // Prioritaskan URL dari upload langsung di frontend
            return await uploadMultipleFiles(filesArray, folderName);
        };

        const fileDasarUrl = await getFileUrls(req.files?.fileDasar, req.body.fileDasarUrl, 'pelanggaran');
        const fileSelesaiUrl = await getFileUrls(req.files?.fileSelesai, req.body.fileSelesaiUrl, 'pelanggaran');
        const filePutusanUrl = await getFileUrls(req.files?.filePutusan, req.body.filePutusanUrl, 'pelanggaran');
        const fileRekomendasiUrl = await getFileUrls(req.files?.fileRekomendasi, req.body.fileRekomendasiUrl, 'pelanggaran');
        const fileSkttUrl = await getFileUrls(req.files?.fileSktt, req.body.fileSkttUrl, 'pelanggaran');
        const fileSktbUrl = await getFileUrls(req.files?.fileSktb, req.body.fileSktbUrl, 'pelanggaran');
        const fileSp3Url = await getFileUrls(req.files?.fileSp3, req.body.fileSp3Url, 'pelanggaran');
        const fileBandingUrl = await getFileUrls(req.files?.fileBanding, req.body.fileBandingUrl, 'pelanggaran');

        // Helper untuk parsing json hukuman
        const hasPtdh = (jenisSidang === 'KEPP' && hukuman) ? hukuman.includes('PTDH') : false;

        const isBanding = banding === 'true' || banding === true;
        const tglSuratObj = new Date(tanggalSurat);
        const tglSelesaiObj = tanggalSuratSelesai ? new Date(tanggalSuratSelesai) : null;
        const tglRekomendasiObj = tanggalRekomendasi ? new Date(tanggalRekomendasi) : null;
        const tglSkepObj = tanggalSkep ? new Date(tanggalSkep) : null;
        const tglSkepBandingObj = (isBanding && tanggalSkepBanding) ? new Date(tanggalSkepBanding) : null;
        const tglBisaAjukanRpsObj = tanggalBisaAjukanRps ? new Date(tanggalBisaAjukanRps) : null;
        const tglSkttObj = tanggalSktt ? new Date(tanggalSktt) : null;
        const tglSktbObj = tanggalSktb ? new Date(tanggalSktb) : null;
        const tglSp3Obj = tanggalSp3 ? new Date(tanggalSp3) : null;

        let finalStatus = statusPenyelesaian;
        if (statusPenyelesaian === 'TIDAK_TERBUKTI_RIKSA') {
            const hasSp3 = nomorSp3 && tglSp3Obj;
            const hasSktt = nomorSktt && tglSkttObj;

            if (!hasSp3) {
                finalStatus = 'PROSES';
            } else if (!hasSktt) {
                finalStatus = 'Belum ada SKTT';
            } else {
                finalStatus = 'TIDAK_TERBUKTI';
            }
        } else if (statusPenyelesaian === 'TIDAK_TERBUKTI_SIDANG') {
            const hasSktb = nomorSktb && tglSktbObj;
            finalStatus = hasSktb ? 'TIDAK_TERBUKTI' : 'Belum ada SKTB';
        }

        const isDraft = req.user.role === 'OPERATOR_SATKER';

        const pelanggaran = await prisma.$transaction(async (tx) => {
            const p = await tx.pelanggaran.create({
                data: {
                    personelId,
                    isDraft,
                    jenisDasar: jenisDasar || null,
                    nomorSurat,
                    tanggalSurat: tglSuratObj,
                    wujudPerbuatan,
                    pangkatSaatMelanggar: pangkatSaatMelanggar || null,
                    jabatanSaatMelanggar: jabatanSaatMelanggar || null,
                    satkerSaatMelanggar: satkerSaatMelanggar || null,
                    keteranganDasar,
                    fileDasarUrl,
                    jenisSidang: jenisSidang || null,
                    hukuman: hukuman || null,
                    banding: isBanding,
                    nomorSkepBanding: isBanding ? (nomorSkepBanding || null) : null,
                    tanggalSkepBanding: tglSkepBandingObj,
                    fileBandingUrl: isBanding ? fileBandingUrl : null,
                    statusPenyelesaian: finalStatus,
                    nomorSktt: nomorSktt || null,
                    tanggalSktt: tglSkttObj,
                    fileSkttUrl,
                    nomorSp3: nomorSp3 || null,
                    tanggalSp3: tglSp3Obj,
                    fileSp3Url,
                    nomorSktb: nomorSktb || null,
                    tanggalSktb: tglSktbObj,
                    fileSktbUrl,
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

            if (hasPtdh) {
                await tx.personel.update({
                    where: { id: personelId },
                    data: { statusKeaktifan: 'TIDAK AKTIF (PTDH)' }
                });
            }

            await tx.auditLog.create({
                data: {
                    userId: req.user.id,
                    aksi: 'CREATE_PELANGGARAN',
                    targetId: p.id,
                    deskripsi: `Menambahkan catatan pelanggaran baru untuk ${access.personel.namaLengkap} (NRP/NIP: ${access.personel.nrpNip})${hasPtdh ? ' beserta status PTDH' : ''}`,
                    alasan: isDraft ? 'Pengajuan Draft pelanggaran baru' : 'Input data oleh Admin'
                }
            });

            return p;
        });

        res.status(201).json({
            message: isDraft ? 'Catatan pelanggaran diajukan sebagai Draft. Menunggu persetujuan Admin Polda.' : 'Catatan pelanggaran ditambahkan',
            data: pelanggaran
        });
    } catch (error) {
        console.error('SERVER ERROR (createPelanggaran):', error);
        res.status(500).json({ message: error.message || 'Terjadi kesalahan pada server saat membuat pelanggaran.' });
    }
};

// Update Pelanggaran (misalnya update status penyelesaian)
const updatePelanggaran = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            statusPenyelesaian, nomorSuratSelesai, tanggalSuratSelesai, keteranganSelesai, tanggalRekomendasi,
            jenisDasar, nomorSurat, tanggalSurat, wujudPerbuatan, keteranganDasar,
            jenisSidang, hukuman, banding, nomorSkepBanding, tanggalSkepBanding,
            nomorSkep, tanggalSkep, nomorRekomendasi, tanggalBisaAjukanRps,
            pangkatSaatMelanggar, satkerSaatMelanggar, jabatanSaatMelanggar,
            nomorSktt, tanggalSktt, nomorSktb, tanggalSktb,
            nomorSp3, tanggalSp3
        } = req.body;

        const existingCatpers = await prisma.pelanggaran.findUnique({ where: { id } });
        if (!existingCatpers) return res.status(404).json({ message: 'Data tidak ditemukan' });

        // Cek Akses
        const access = await checkOperatorAccess(req, existingCatpers.personelId);
        if (!access.allowed) return res.status(access.statusCode || 403).json({ message: access.message });

        //- [x] Fix file upload failure & enhance attachment management (View/Delete/Reset)
        let { deletedFiles, deletedItems } = req.body;
        try {
            deletedFiles = typeof deletedFiles === 'string' ? JSON.parse(deletedFiles) : (deletedFiles || []);
        } catch (e) {
            deletedFiles = [];
        }

        try {
            deletedItems = typeof deletedItems === 'string' ? JSON.parse(deletedItems) : (deletedItems || []);
        } catch (e) {
            deletedItems = [];
        }

        // Helper fungsi untuk handle upload baru dan penghapusan link dari eksisting file
        const handleFilesUpdate = async (existingUrls, newFiles, isAllDeleted, deletedItems = [], folderName = 'pelanggaran') => {
            let urls = [];

            if (!isAllDeleted) {
                urls = existingUrls ? existingUrls.split(',').filter(u => u) : [];
                if (deletedItems && deletedItems.length > 0) {
                    // Coba hapus file secara fisik dari bucket jika dia dihapus dari UI
                    for (const urlToDelete of deletedItems) {
                        if (urls.includes(urlToDelete)) {
                            await deleteFileFromSupabase(urlToDelete).catch(console.error);
                        }
                    }
                    urls = urls.filter(url => !deletedItems.includes(url));
                }
            } else if (existingUrls) { // Jika semua file ditiadakan, hapus semuanya dari Storage
                const oldUrls = existingUrls.split(',').filter(u => u);
                for (const oldUrl of oldUrls) {
                    await deleteFileFromSupabase(oldUrl).catch(console.error);
                }
            }

            // Upload dan gabungkan url file yang baru masuk
            if (newFiles && newFiles.length > 0) {
                const newUrlsStr = await uploadMultipleFiles(newFiles, folderName);
                if (newUrlsStr) {
                    urls = [...urls, ...newUrlsStr.split(',')];
                }
            }
            return urls.length > 0 ? urls.join(',') : null;
        };

        // Parallelize physical file handling (upload new, delete marked) to improve response time
        // req.body.fileFieldNameUrl can contain pre-uploaded Supabase URLs
        const handleFilesUpdateWithDirect = async (fieldName, existingUrls, newFiles, isAllDeleted, deletedItems = [], folderName = 'pelanggaran') => {
            const bodyUrl = req.body[`${fieldName}Url`];
            if (bodyUrl) {
                // Jika frontend kirim URL matang dari Direct Upload, kita pakai itu + existing yang tidak dihapus
                let urls = existingUrls ? existingUrls.split(',').filter(u => u && !deletedItems.includes(u)) : [];
                return [...urls, ...bodyUrl.split(',')].join(',') || null;
            }
            return await handleFilesUpdate(existingUrls, newFiles, isAllDeleted, deletedItems, folderName);
        };

        const [
            fileDasarUrl,
            fileSelesaiUrl,
            filePutusanUrl,
            fileRekomendasiUrl,
            fileSkttUrl,
            fileSktbUrl,
            fileSp3Url,
            fileBandingUrl
        ] = await Promise.all([
            handleFilesUpdateWithDirect('fileDasar', existingCatpers.fileDasarUrl, req.files?.fileDasar, deletedFiles.includes('fileDasar'), deletedItems),
            handleFilesUpdateWithDirect('fileSelesai', existingCatpers.fileSelesaiUrl, req.files?.fileSelesai, deletedFiles.includes('fileSelesai'), deletedItems),
            handleFilesUpdateWithDirect('filePutusan', existingCatpers.filePutusanUrl, req.files?.filePutusan, deletedFiles.includes('filePutusan'), deletedItems),
            handleFilesUpdateWithDirect('fileRekomendasi', existingCatpers.fileRekomendasiUrl, req.files?.fileRekomendasi, deletedFiles.includes('fileRekomendasi'), deletedItems),
            handleFilesUpdateWithDirect('fileSktt', existingCatpers.fileSkttUrl, req.files?.fileSktt, deletedFiles.includes('fileSktt'), deletedItems),
            handleFilesUpdateWithDirect('fileSktb', existingCatpers.fileSktbUrl, req.files?.fileSktb, deletedFiles.includes('fileSktb'), deletedItems),
            handleFilesUpdateWithDirect('fileSp3', existingCatpers.fileSp3Url, req.files?.fileSp3, deletedFiles.includes('fileSp3'), deletedItems),
            handleFilesUpdateWithDirect('fileBanding', existingCatpers.fileBandingUrl, req.files?.fileBanding, deletedFiles.includes('fileBanding'), deletedItems)
        ]);

        const tglSuratObj = tanggalSurat ? new Date(tanggalSurat) : existingCatpers.tanggalSurat;

        // Helper untuk parse tanggal (jika string kosong maka null, jika undefined/null maka eksisting)
        const parseDateNullable = (val, existing) => {
            if (val === '') return null;
            if (!val) return existing;
            const d = new Date(val);
            return isNaN(d.getTime()) ? existing : d;
        };

        const tglSelesaiObj = parseDateNullable(tanggalSuratSelesai, existingCatpers.tanggalSuratSelesai);
        const tglRekomendasiObj = parseDateNullable(tanggalRekomendasi, existingCatpers.tanggalRekomendasi);
        const tglSkepObj = parseDateNullable(tanggalSkep, existingCatpers.tanggalSkep);
        const tglBisaAjukanRpsObj = parseDateNullable(tanggalBisaAjukanRps, existingCatpers.tanggalBisaAjukanRps);
        const tglSkttObj = parseDateNullable(tanggalSktt, existingCatpers.tanggalSktt);
        const tglSktbObj = parseDateNullable(tanggalSktb, existingCatpers.tanggalSktb);
        const tglSp3Obj = parseDateNullable(tanggalSp3, existingCatpers.tanggalSp3);
        const tglSkepBandingObj = parseDateNullable(tanggalSkepBanding, existingCatpers.tanggalSkepBanding);

        const isBanding = banding !== undefined ? (banding === 'true' || banding === true) : existingCatpers.banding;

        // Helper untuk string nullable (jika string kosong maka null, jika undefined maka eksisting)
        const parseStringNullable = (val, existing) => (val === '' ? null : (val !== undefined ? val : existing));

        const finalJenisSidang = parseStringNullable(jenisSidang, existingCatpers.jenisSidang);
        const finalHukuman = parseStringNullable(hukuman, existingCatpers.hukuman);
        const hasPtdh = (finalJenisSidang === 'KEPP' && finalHukuman) ? finalHukuman.includes('PTDH') : false;

        let finalStatus = statusPenyelesaian || existingCatpers.statusPenyelesaian;
        if (finalStatus === 'TIDAK_TERBUKTI_RIKSA' || finalStatus === 'Belum ada SKTT' || finalStatus === 'PROSES') {
            const hasSp3 = (nomorSp3 || existingCatpers.nomorSp3) && (tglSp3Obj || existingCatpers.tanggalSp3);
            const hasSktt = (nomorSktt || existingCatpers.nomorSktt) && (tglSkttObj || existingCatpers.tanggalSktt);

            // Jika asalnya TIDAK_TERBUKTI_RIKSA, kita evaluasi ulang statusnya
            if (statusPenyelesaian === 'TIDAK_TERBUKTI_RIKSA' ||
                existingCatpers.statusPenyelesaian === 'TIDAK_TERBUKTI_RIKSA' ||
                existingCatpers.statusPenyelesaian === 'Belum ada SKTT' ||
                existingCatpers.statusPenyelesaian === 'PROSES') {

                if (!hasSp3) {
                    finalStatus = 'PROSES';
                } else if (!hasSktt) {
                    finalStatus = 'Belum ada SKTT';
                } else {
                    finalStatus = 'TIDAK_TERBUKTI';
                }
            }
        } else if (finalStatus === 'TIDAK_TERBUKTI_SIDANG' || finalStatus === 'Belum ada SKTB') {
            const hasSktb = (nomorSktb || existingCatpers.nomorSktb) && (tglSktbObj || existingCatpers.tanggalSktb);
            finalStatus = hasSktb ? 'TIDAK_TERBUKTI' : 'Belum ada SKTB';
        }

        const pelanggaran = await prisma.$transaction(async (tx) => {
            // Helper untuk string nullable (jika string kosong maka null, jika undefined maka eksisting)
            const parseStringNullable = (val, existing) => (val === '' ? null : (val !== undefined ? val : existing));

            const p = await tx.pelanggaran.update({
                where: { id },
                data: {
                    jenisDasar: parseStringNullable(jenisDasar, existingCatpers.jenisDasar),
                    nomorSurat: parseStringNullable(nomorSurat, existingCatpers.nomorSurat),
                    tanggalSurat: tglSuratObj,
                    wujudPerbuatan: parseStringNullable(wujudPerbuatan, existingCatpers.wujudPerbuatan),
                    pangkatSaatMelanggar: pangkatSaatMelanggar !== undefined ? (pangkatSaatMelanggar || null) : existingCatpers.pangkatSaatMelanggar,
                    jabatanSaatMelanggar: jabatanSaatMelanggar !== undefined ? (jabatanSaatMelanggar || null) : existingCatpers.jabatanSaatMelanggar,
                    satkerSaatMelanggar: satkerSaatMelanggar !== undefined ? (satkerSaatMelanggar || null) : existingCatpers.satkerSaatMelanggar,
                    keteranganDasar: parseStringNullable(keteranganDasar, existingCatpers.keteranganDasar),
                    fileDasarUrl,
                    statusPenyelesaian: finalStatus,
                    nomorSuratSelesai: parseStringNullable(nomorSuratSelesai, existingCatpers.nomorSuratSelesai),
                    tanggalSuratSelesai: tglSelesaiObj,
                    keteranganSelesai: parseStringNullable(keteranganSelesai, existingCatpers.keteranganSelesai),
                    fileSelesaiUrl,
                    filePutusanUrl,
                    tanggalRekomendasi: tglRekomendasiObj,
                    jenisSidang: parseStringNullable(jenisSidang, existingCatpers.jenisSidang),
                    hukuman: finalHukuman,
                    banding: isBanding,
                    nomorSkepBanding: isBanding ? parseStringNullable(nomorSkepBanding, existingCatpers.nomorSkepBanding) : null,
                    tanggalSkepBanding: isBanding ? tglSkepBandingObj : null,
                    fileBandingUrl: isBanding ? fileBandingUrl : null,
                    nomorSkep: parseStringNullable(nomorSkep, existingCatpers.nomorSkep),
                    tanggalSkep: tglSkepObj,
                    nomorRekomendasi: parseStringNullable(nomorRekomendasi, existingCatpers.nomorRekomendasi),
                    tanggalBisaAjukanRps: tglBisaAjukanRpsObj,
                    fileRekomendasiUrl,
                    nomorSktt: parseStringNullable(nomorSktt, existingCatpers.nomorSktt),
                    tanggalSktt: tglSkttObj,
                    fileSkttUrl,
                    nomorSp3: parseStringNullable(nomorSp3, existingCatpers.nomorSp3),
                    tanggalSp3: tglSp3Obj,
                    fileSp3Url,
                    nomorSktb: parseStringNullable(nomorSktb, existingCatpers.nomorSktb),
                    tanggalSktb: tglSktbObj,
                    fileSktbUrl,
                    catatanRevisi: null,
                    ...(req.user.role === 'OPERATOR_SATKER' ? { isDraft: true } : {})
                }
            });

            const wasPtdh = (existingCatpers.jenisSidang === 'KEPP' && existingCatpers.hukuman) ? existingCatpers.hukuman.includes('PTDH') : false;

            if (hasPtdh) {
                await tx.personel.update({
                    where: { id: existingCatpers.personelId },
                    data: { statusKeaktifan: 'TIDAK AKTIF (PTDH)' }
                });
            } else if (wasPtdh) {
                // Jika sebelumnya PTDH tapi sekarang tidak, kembalikan ke AKTIF
                // (Ini mencakup kasus 'Tinjau Kembali' lalu dihapus PTDH-nya)
                await tx.personel.update({
                    where: { id: existingCatpers.personelId },
                    data: { statusKeaktifan: 'AKTIF' }
                });
            }

            await tx.auditLog.create({
                data: {
                    userId: req.user.id,
                    aksi: 'UPDATE_PELANGGARAN',
                    targetId: id,
                    deskripsi: `Mengupdate catatan pelanggaran untuk ${access.personel.namaLengkap} (NRP/NIP: ${access.personel.nrpNip})${hasPtdh ? ' beserta set status PTDH' : ''}`,
                    alasan: req.user.role === 'OPERATOR_SATKER' ? 'Perbaikan data (diubah menjadi Draft kembali)' : 'Update data penyelesaian / sidang'
                }
            });

            return p;
        });

        res.json({ message: 'Catatan pelanggaran diperbarui', data: pelanggaran });

    } catch (error) {
        console.error('SERVER ERROR (updatePelanggaran):', error);
        res.status(500).json({ message: error.message || 'Terjadi kesalahan pada server saat memperbarui pelanggaran.' });
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
        console.error('SERVER ERROR (updatePelanggaran):', error);
        res.status(500).json({ message: error.message || 'Terjadi kesalahan pada server saat memperbarui pelanggaran.' });
    }
};

const deletePelanggaran = async (req, res) => {
    try {
        const { id } = req.params;
        const { alasan } = req.body;

        const existingCatpers = await prisma.pelanggaran.findUnique({ where: { id } });
        if (!existingCatpers) return res.status(404).json({ message: 'Data tidak ditemukan' });

        // BLOKIR AKSES DELETE BAGI OPERATOR
        if (req.user.role === 'OPERATOR_SATKER') {
            return res.status(403).json({ message: 'Operator tidak memiliki izin untuk menghapus catatan pelanggaran.' });
        }

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
                    deskripsi: `Menghapus catatan pelanggaran milik ${access.personel.namaLengkap} (NRP/NIP: ${access.personel.nrpNip})`,
                    alasan: alasan || 'Dihapus oleh admin'
                }
            })
        ]);

        res.json({ message: 'Catatan pelanggaran berhasil dihapus.' });
    } catch (error) {
        console.error('SERVER ERROR (updatePelanggaran):', error);
        res.status(500).json({ message: error.message || 'Terjadi kesalahan pada server saat memperbarui pelanggaran.' });
    }
}

// Admin Approval: Setujui Pelanggaran
const approvePelanggaran = async (req, res) => {
    try {
        const { id } = req.params;
        if (req.user.role !== 'ADMIN_POLDA') return res.status(403).json({ message: 'Hanya Admin Polda yang dapat menyetujui data.' });

        await prisma.$transaction(async (tx) => {
            const pel = await tx.pelanggaran.findUnique({
                where: { id },
                include: { personel: true }
            });
            if (!pel) throw new Error('Data tidak ditemukan');

            await tx.pelanggaran.update({
                where: { id },
                data: {
                    isDraft: false,
                    catatanRevisi: null
                }
            });

            await tx.auditLog.create({
                data: {
                    userId: req.user.id,
                    aksi: 'APPROVE_PELANGGARAN',
                    targetId: id,
                    deskripsi: `Menyetujui catatan pelanggaran untuk ${pel.personel.namaLengkap} (NRP/NIP: ${pel.personel.nrpNip})`,
                    alasan: 'Data valid sesuai verifikasi Admin'
                }
            });
        });

        res.json({ message: 'Catatan pelanggaran berhasil disetujui.' });
    } catch (error) {
        res.status(500).json({ message: 'Gagal menyetujui data.' });
    }
}

// Reject/Revision Draft
const rejectPelanggaran = async (req, res) => {
    try {
        const { id } = req.params;
        const { catatanRevisi } = req.body;

        if (req.user.role !== 'ADMIN_POLDA') return res.status(403).json({ message: 'Hanya Admin Polda yang dapat menolak data.' });
        if (!catatanRevisi) return res.status(400).json({ message: 'Catatan revisi wajib diisi jika menolak data.' });

        await prisma.$transaction(async (tx) => {
            const pel = await tx.pelanggaran.findUnique({
                where: { id },
                include: { personel: true }
            });
            if (!pel) throw new Error('Data tidak ditemukan');

            await tx.pelanggaran.update({
                where: { id },
                data: { catatanRevisi }
            });

            await tx.auditLog.create({
                data: {
                    userId: req.user.id,
                    aksi: 'REJECT_PELANGGARAN',
                    targetId: id,
                    deskripsi: `Mengembalikan draft catatan pelanggaran untuk revisi (${pel.personel.namaLengkap} - NRP/NIP: ${pel.personel.nrpNip})`,
                    alasan: catatanRevisi
                }
            });
        });

        res.json({ message: 'Draft catatan pelanggaran dikembalikan untuk revisi.' });
    } catch (error) {
        res.status(500).json({ message: 'Gagal memproses penolakan.' });
    }
}

const resetPelanggaranSection = async (req, res) => {
    try {
        const { id } = req.params;
        const { section, alasan } = req.body; // section: 'sidang' | 'rekomendasi' | 'penyelesaian'

        if (!alasan) return res.status(400).json({ message: 'Alasan reset wajib diisi.' });

        const existing = await prisma.pelanggaran.findUnique({
            where: { id },
            include: { personel: true }
        });

        if (!existing) return res.status(404).json({ message: 'Catatan tidak ditemukan.' });

        // Cek Akses
        const access = await checkOperatorAccess(req, existing.personelId);
        if (!access.allowed) return res.status(access.statusCode || 403).json({ message: access.message });

        let updateData = {};
        let sectionName = '';
        const filesToDelete = [];

        if (section === 'sidang') {
            sectionName = 'Putusan Sidang & Sanksi (Serta Data Rekomendasi)';
            updateData = {
                jenisSidang: null,
                hukuman: null,
                banding: false,
                nomorSkepBanding: null,
                tanggalSkepBanding: null,
                fileBandingUrl: null,
                nomorSkep: null,
                tanggalSkep: null,
                tanggalBisaAjukanRps: null,
                filePutusanUrl: null,
                // Otomatis reset rekomendasi karena tergantung sidang
                nomorRekomendasi: null,
                tanggalRekomendasi: null,
                fileRekomendasiUrl: null,
                statusPenyelesaian: 'PROSES'
            };
            if (existing.fileBandingUrl) filesToDelete.push(...existing.fileBandingUrl.split(','));
            if (existing.filePutusanUrl) filesToDelete.push(...existing.filePutusanUrl.split(','));
            if (existing.fileRekomendasiUrl) filesToDelete.push(...existing.fileRekomendasiUrl.split(','));

        } else if (section === 'rekomendasi') {
            sectionName = 'Detail Pemulihan Status (Rekomendasi)';
            updateData = {
                nomorRekomendasi: null,
                tanggalRekomendasi: null,
                fileRekomendasiUrl: null
            };
            if (existing.fileRekomendasiUrl) filesToDelete.push(...existing.fileRekomendasiUrl.split(','));

        } else if (section === 'sktt') {
            sectionName = 'Surat Keterangan Tidak Terbukti (SKTT)';
            updateData = {
                nomorSktt: null,
                tanggalSktt: null,
                fileSkttUrl: null
            };
            if (existing.fileSkttUrl) filesToDelete.push(...existing.fileSkttUrl.split(','));

        } else if (section === 'sp3') {
            sectionName = 'Surat Perintah Penghentian Penyelidikan/Penyidikan (SP3/SP4)';
            updateData = {
                nomorSp3: null,
                tanggalSp3: null,
                fileSp3Url: null,
                // Jika SP3 direset, SKTT juga harus direset karena dependensi UI/logic
                nomorSktt: null,
                tanggalSktt: null,
                fileSkttUrl: null
            };
            if (existing.fileSp3Url) filesToDelete.push(...existing.fileSp3Url.split(','));
            if (existing.fileSkttUrl) filesToDelete.push(...existing.fileSkttUrl.split(','));

        } else if (section === 'sktb') {
            sectionName = 'Surat Keterangan Tidak Bersalah (SKTB)';
            updateData = {
                nomorSktb: null,
                tanggalSktb: null,
                fileSktbUrl: null
            };
            if (existing.fileSktbUrl) filesToDelete.push(...existing.fileSktbUrl.split(','));

        } else if (section === 'penyelesaian') {
            sectionName = 'Seluruh Data Penyelesaian (Status Kembali Progres)';
            updateData = {
                statusPenyelesaian: 'PROSES',
                nomorSuratSelesai: null,
                tanggalSuratSelesai: null,
                keteranganSelesai: null,
                fileSelesaiUrl: null,
                jenisSidang: null,
                hukuman: null,
                banding: false,
                nomorSkepBanding: null,
                tanggalSkepBanding: null,
                fileBandingUrl: null,
                nomorSkep: null,
                tanggalSkep: null,
                tanggalBisaAjukanRps: null,
                filePutusanUrl: null,
                nomorRekomendasi: null,
                tanggalRekomendasi: null,
                fileRekomendasiUrl: null,
                nomorSktt: null,
                tanggalSktt: null,
                fileSkttUrl: null,
                nomorSp3: null,
                tanggalSp3: null,
                fileSp3Url: null,
                nomorSktb: null,
                tanggalSktb: null,
                fileSktbUrl: null
            };
            // Collect all files related to resolution
            const fileFields = [
                'fileSelesaiUrl', 'filePutusanUrl', 'fileRekomendasiUrl', 'fileSkttUrl',
                'fileSp3Url', 'fileSktbUrl', 'fileBandingUrl'
            ];
            fileFields.forEach(field => {
                if (existing[field]) filesToDelete.push(...existing[field].split(','));
            });

        } else {
            return res.status(400).json({ message: 'Grup data (section) tidak valid.' });
        }

        // Jika operator yang mereset, kembalikan status ke Draft
        if (req.user.role === 'OPERATOR_SATKER') {
            updateData.isDraft = true;
        }

        await prisma.$transaction(async (tx) => {
            await tx.pelanggaran.update({
                where: { id },
                data: updateData
            });

            await tx.auditLog.create({
                data: {
                    userId: req.user.id,
                    aksi: `RESET_${section.toUpperCase()}`,
                    targetId: id,
                    deskripsi: `Mereset data ${sectionName} untuk ${existing.personel.namaLengkap} (NRP/NIP: ${existing.personel.nrpNip})`,
                    alasan: alasan
                }
            });

            // Physical file deletion (best effort inside transaction or outside if preferred)
            // Note: Since deleteFileFromSupabase is async and can fail, we usually do it after or use a background job.
            // For simplicity and immediate effect, we'll try to do it here.
            for (const url of filesToDelete) {
                if (url) await deleteFileFromSupabase(url).catch(console.error);
            }
        });

        res.json({ message: `Data ${sectionName} berhasil dikosongkan.` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Gagal mereset data.' });
    }
};

module.exports = {
    createPelanggaran,
    updatePelanggaran,
    getPelanggaranById,
    deletePelanggaran,
    approvePelanggaran,
    rejectPelanggaran,
    resetPelanggaranSection
};
