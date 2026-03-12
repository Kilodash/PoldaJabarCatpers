const prisma = require('../prisma');

// Helper: load semua pengaturan sekaligus (1 query, bukan per-key)
const loadAllSettings = async () => {
    const settings = await prisma.pengaturan.findMany();
    return Object.fromEntries(settings.map(s => [s.key, s.value]));
};

// Helper validasi NRP/NIP — menerima settingsMap (sudah di-load sebelumnya)
const isNrpNipValid = (jenisPegawai, nrpNip, settingsMap) => {
    let requiredLength = jenisPegawai === 'POLRI'
        ? parseInt(settingsMap['PANJANG_NRP_POLRI'] || '8')
        : parseInt(settingsMap['PANJANG_NIP_PNS'] || '18');

    const regex = new RegExp(`^\\d{${requiredLength}}$`);
    if (!regex.test(nrpNip)) return false;

    if (jenisPegawai === 'POLRI' && nrpNip.length >= 4) {
        const mm = parseInt(nrpNip.substring(2, 4));
        if (mm < 1 || mm > 12) return false;
    } else if (jenisPegawai !== 'POLRI' && nrpNip.length >= 8) {
        const mm = parseInt(nrpNip.substring(4, 6));
        const dd = parseInt(nrpNip.substring(6, 8));
        if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return false;
    }
    return true;
};

// Helper ambil usia pensiun dari settingsMap
const getUmurPensiun = (jenisPegawai, settingsMap) => {
    const key = jenisPegawai === 'POLRI' ? 'USIA_PENSIUN_POLRI' : 'USIA_PENSIUN_PNS';
    return parseInt(settingsMap[key] || '58');
};


// Tambah Personel
const createPersonel = async (req, res) => {
    try {
        const { jenisPegawai, nrpNip, namaLengkap, pangkat, jabatan, satkerId, tanggalLahir } = req.body;

        // Validasi Jenis Pegawai
        if (!['POLRI', 'PNS'].includes(jenisPegawai)) {
            return res.status(400).json({ message: 'Jenis Pegawai tidak valid (POLRI/PNS).' });
        }

        // Load SEMUA pengaturan sekaligus (1 query, bukan banyak query terpisah)
        const settingsMap = await loadAllSettings();

        // Validasi NRP/NIP Dinamis (sync, tanpa query DB)
        const isValidFormat = isNrpNipValid(jenisPegawai, nrpNip, settingsMap);
        if (!isValidFormat) {
            return res.status(400).json({
                message: 'Format panjang digit NRP/NIP tidak valid berdasarkan Pengaturan Sistem saat ini (Lihat menu Pengaturan Sistem).'
            });
        }

        // Validasi Kewajaran Usia/Pensiun
        const tglLahir = new Date(tanggalLahir);
        const today = new Date();
        let age = today.getFullYear() - tglLahir.getFullYear();
        const m = today.getMonth() - tglLahir.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < tglLahir.getDate())) {
            age--;
        }

        const keyUsiaMin = jenisPegawai === 'POLRI' ? 'USIA_MINIMAL_POLRI' : 'USIA_MINIMAL_PNS';
        const umurMinimal = parseInt(settingsMap[keyUsiaMin] || '18');

        if (age < umurMinimal) {
            return res.status(400).json({ message: `Usia tidak wajar (Belum mencapai batas minimal ${umurMinimal} tahun).` });
        }

        const umurPensiun = getUmurPensiun(jenisPegawai, settingsMap);
        if (age >= umurPensiun) {
            return res.status(400).json({ message: `Personel sudah memasuki usia pensiun (${umurPensiun} tahun).` });
        }

        // Hitung Tanggal Pensiun (ulang tahun ke-{umurPensiun})
        const tanggalPensiunObj = new Date(tglLahir);
        tanggalPensiunObj.setFullYear(tanggalPensiunObj.getFullYear() + umurPensiun);

        // Validasi Duplikasi (Abaikan yang sudah di-soft delete)
        const exisingPersonel = await prisma.personel.findFirst({ where: { nrpNip, deletedAt: null } });
        if (exisingPersonel) {
            return res.status(400).json({ message: `NRP/NIP ${nrpNip} sudah terdaftar di sistem.` });
        }

        // Validasi Satker Akses
        let targetSatkerId = parseInt(satkerId);
        if (req.user.role === 'OPERATOR_SATKER') {
            // Operator hanya bisa menambahkan ke Satker-nya sendiri
            if (targetSatkerId !== req.user.satkerId) {
                return res.status(403).json({ message: 'Anda hanya dapat menambahkan personel pada Satker Anda sendiri.' });
            }
        }

        // Cek Satker existence
        const satker = await prisma.satker.findUnique({ where: { id: targetSatkerId } });
        if (!satker) return res.status(400).json({ message: 'Satker tidak ditemukan.' });

        // Operator creates Personel directly as Approved (no longer Draft)
        const isDraft = false;

        const personel = await prisma.$transaction(async (tx) => {
            const p = await tx.personel.create({
                data: {
                    jenisPegawai,
                    nrpNip,
                    namaLengkap,
                    pangkat,
                    jabatan,
                    satkerId: targetSatkerId,
                    tanggalLahir: tglLahir,
                    tanggalPensiun: tanggalPensiunObj,
                    isDraft: isDraft
                }
            });

            await tx.auditLog.create({
                data: {
                    userId: req.user.id,
                    aksi: 'CREATE_PERSONEL',
                    targetId: p.id,
                    deskripsi: `Menambahkan Personel baru (${namaLengkap} - NRP/NIP: ${nrpNip})`,
                    alasan: 'Input data Personel baru'
                }
            });

            return p;
        });

        res.status(201).json({
            message: 'Data personel berhasil ditambahkan',
            data: personel
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
};

// Ambil semua Personel dengan Filter
const getAllPersonel = async (req, res) => {
    try {
        let whereClause = {};

        // Filter berdasarkan Role (Access Control)
        if (req.user.role === 'OPERATOR_SATKER') {
            whereClause.satkerId = req.user.satkerId;
        }

        // TAMPILKAN YANG BELUM DIHAPUS SAJA
        whereClause.deletedAt = null;

        // Filter Draft vs Approved
        if (req.query.isDraft === 'true') {
            whereClause.isDraft = true;
        } else if (req.query.isDraft === 'false') {
            whereClause.isDraft = false;
        } else if (req.query.category === 'butuhApproval') {
            // Jika kategori butuh approval, jangan paksa isDraft = false
            // Karena kita mencari yang isDraft: true ATAU pelanggaran isDraft: true
        } else {
            // Default: Tampilkan yang sudah approve saja 
            whereClause.isDraft = false;
        }

        // Filter tambahan dari query params jika ada
        if (req.query.satkerId && req.user.role === 'ADMIN_POLDA') {
            whereClause.satkerId = parseInt(req.query.satkerId);
        }
        if (req.query.jenisPegawai) {
            whereClause.jenisPegawai = req.query.jenisPegawai;
        }

        if (req.query.search) {
            delete whereClause.deletedAt; // Biarkan cari yang sudah tidak aktif / deleted juga jika pencarian spesifik
            whereClause.OR = [
                { namaLengkap: { contains: req.query.search, mode: 'insensitive' } },
                { nrpNip: { contains: req.query.search, mode: 'insensitive' } },
                { nrpNip: { contains: `_${req.query.search}`, mode: 'insensitive' } } // Cari juga yang sudah ber-prefix DEL_
            ]
        }

        const currentDate = new Date();

        // Filter Category untuk Drill-down Dashboard
        if (req.query.category) {
            const cat = req.query.category;

            if (cat === 'tidakAktif') {
                delete whereClause.deletedAt;
                whereClause.OR = [
                    { tanggalPensiun: { lte: currentDate } },
                    { statusKeaktifan: { not: 'AKTIF' } },
                    { deletedAt: { not: null } }
                ];
            } else if (cat === 'catpersAktif') {
                whereClause.statusKeaktifan = 'AKTIF';
                whereClause.pelanggaran = {
                    some: {
                        deletedAt: null,
                        isDraft: false,
                        OR: [
                            { statusPenyelesaian: 'PROSES' },
                            {
                                statusPenyelesaian: { in: ['MENJALANI_HUKUMAN', 'SIDANG'] },
                                tanggalRekomendasi: null,
                                OR: [
                                    { tanggalBisaAjukanRps: null },
                                    { tanggalBisaAjukanRps: { gt: new Date() } }
                                ]
                            }
                        ]
                    }
                };
            } else if (cat === 'pernahTercatat') {
                whereClause.statusKeaktifan = 'AKTIF';
                whereClause.pelanggaran = {
                    some: {
                        deletedAt: null,
                        isDraft: false,
                        statusPenyelesaian: { in: ['MENJALANI_HUKUMAN', 'SIDANG'] },
                        tanggalRekomendasi: { not: null }
                    }
                };
            } else if (cat === 'belumRps') {
                whereClause.statusKeaktifan = 'AKTIF';
                whereClause.pelanggaran = {
                    some: {
                        deletedAt: null,
                        isDraft: false,
                        statusPenyelesaian: { in: ['MENJALANI_HUKUMAN', 'SIDANG'] },
                        tanggalRekomendasi: null,
                        tanggalBisaAjukanRps: { lte: currentDate }
                    }
                };
            } else if (cat === 'tidakTerbukti') {
                whereClause.statusKeaktifan = 'AKTIF';
                whereClause.pelanggaran = {
                    some: {
                        deletedAt: null,
                        isDraft: false,
                        statusPenyelesaian: 'TIDAK_TERBUKTI'
                    }
                };
            } else if (cat === 'belumSktt') {
                whereClause.statusKeaktifan = 'AKTIF';
                whereClause.pelanggaran = { some: { statusPenyelesaian: 'Belum ada SKTT', deletedAt: null, isDraft: false } };
            } else if (cat === 'belumSktb') {
                whereClause.statusKeaktifan = 'AKTIF';
                whereClause.pelanggaran = { some: { statusPenyelesaian: 'Belum ada SKTB', deletedAt: null, isDraft: false } };
            } else if (cat === 'perdamaian') {
                whereClause.statusKeaktifan = 'AKTIF';
                whereClause.pelanggaran = {
                    some: {
                        deletedAt: null,
                        isDraft: false,
                        statusPenyelesaian: 'PERDAMAIAN'
                    }
                };
            } else if (cat === 'DRAFT' || cat === 'butuhApproval') {
                whereClause.OR = [
                    { isDraft: true },
                    { pelanggaran: { some: { isDraft: true, deletedAt: null } } }
                ];
            }
        }

        // Paginasi opsional — jika ada query `page`, aktifkan paginasi
        const page = req.query.page ? parseInt(req.query.page) : null;
        const limit = parseInt(req.query.limit || '100');
        const skip = page ? (page - 1) * limit : undefined;

        const [listPersonel, totalCount] = await Promise.all([
            prisma.personel.findMany({
                where: whereClause,
                include: {
                    satker: true,
                    pelanggaran: { where: { deletedAt: null } },
                    _count: {
                        select: { pelanggaran: { where: { deletedAt: null } } }
                    }
                },
                orderBy: { namaLengkap: 'asc' },
                ...(skip !== undefined ? { skip, take: limit } : {})
            }),
            page ? prisma.personel.count({ where: whereClause }) : Promise.resolve(null)
        ]);

        const formattedPersonel = listPersonel.map(p => {
            let statusPersonel = 'Tidak Ada Catatan';
            let statusRps = '-';

            let hasDraftViolation = false;

            if (p.pelanggaran && p.pelanggaran.length > 0) {
                let maxSeverity = 0;
                let adaBelumRps = false;

                for (let v of p.pelanggaran) {
                    if (v.isDraft) {
                        hasDraftViolation = true;
                        continue;
                    }

                    let s = 0;
                    if (v.statusPenyelesaian === 'PROSES') {
                        s = 100; // 1. Proses
                    } else if (v.statusPenyelesaian === 'MENJALANI_HUKUMAN' || v.statusPenyelesaian === 'SIDANG') {
                        if (v.tanggalRekomendasi) {
                            s = 80; // 3. Pernah Tercatat
                        } else {
                            const isPastRps = v.tanggalBisaAjukanRps && new Date(v.tanggalBisaAjukanRps) <= currentDate;
                            s = isPastRps ? 90 : 100; // 2. Belum Rekomendasi (90), atau tetap Proses (100) jika belum lewat
                            adaBelumRps = true;
                        }
                    } else if (v.statusPenyelesaian === 'Belum ada SKTB') {
                        s = 70; // 4. Belum SKTB
                    } else if (v.statusPenyelesaian === 'Belum ada SKTT') {
                        s = 60; // 5. Belum SKTT
                    } else if (v.statusPenyelesaian === 'TIDAK_TERBUKTI') {
                        s = 50; // 6. Tidak Terbukti
                    } else if (v.statusPenyelesaian === 'PERDAMAIAN') {
                        s = 40; // 7. Perdamaian
                    }

                    if (s > maxSeverity) maxSeverity = s;
                }

                if (maxSeverity === 100) statusPersonel = 'Proses';
                else if (maxSeverity === 90) statusPersonel = 'Belum Rekomendasi';
                else if (maxSeverity === 80) statusPersonel = 'Pernah Tercatat';
                else if (maxSeverity === 70) statusPersonel = 'Belum SKTB';
                else if (maxSeverity === 60) statusPersonel = 'Belum SKTT';
                else if (maxSeverity === 50) statusPersonel = 'Tidak Terbukti';
                else if (maxSeverity === 40) statusPersonel = 'Perdamaian';
                else statusPersonel = 'Bersih';

                const currentV = p.pelanggaran.filter(v => !v.isDraft && ['PROSES', 'MENJALANI_HUKUMAN', 'SIDANG', 'Belum ada SKTT', 'Belum ada SKTB'].includes(v.statusPenyelesaian));
                const anyBelumRps = currentV.some(v => v.tanggalRekomendasi === null && ['MENJALANI_HUKUMAN', 'SIDANG'].includes(v.statusPenyelesaian));
                statusRps = anyBelumRps ? 'Belum Ada RPS' : 'Sudah Ada RPS';

                // Status RPS hanya relevan untuk Pelanggaran Aktif/Pernah Tercatat
                if (maxSeverity === 0 || maxSeverity === 2 && !anyBelumRps) statusRps = '-';
            }

            const { pelanggaran, ...rest } = p;
            return {
                ...rest,
                statusPersonel,
                statusRps,
                hasDraftViolation
            };
        });

        // Jika paginasi aktif, kembalikan format paginated; jika tidak, backward-compatible
        if (page) {
            res.json({
                data: formattedPersonel,
                total: totalCount,
                page,
                totalPages: Math.ceil(totalCount / limit)
            });
        } else {
            res.json(formattedPersonel);
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
};


// Ambil Detail Personel & Catatan Pelanggarannya
const getPersonelById = async (req, res) => {
    try {
        const { id } = req.params;
        const personel = await prisma.personel.findUnique({
            where: { id },
            include: {
                satker: true,
                pelanggaran: {
                    where: { deletedAt: null }, // Semua diperlihatkan di detail (termasuk draft)
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        if (!personel) return res.status(404).json({ message: 'Personel tidak ditemukan.' });

        // Pengecekan Akses Operator
        if (req.user.role === 'OPERATOR_SATKER' && personel.satkerId !== req.user.satkerId) {
            return res.status(403).json({ message: 'Akses ditolak.' });
        }

        res.json(personel);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
};

// Update Personel
const updatePersonel = async (req, res) => {
    try {
        const { id } = req.params;
        const { namaLengkap, pangkat, jabatan, satkerId, tanggalLahir } = req.body;

        const existingPersonel = await prisma.personel.findUnique({ where: { id } });
        if (!existingPersonel) return res.status(404).json({ message: 'Personel tidak ditemukan.' });

        // BLOKIR AKSES UPDATE BAGI OPERATOR
        if (req.user.role === 'OPERATOR_SATKER') {
            return res.status(403).json({ message: 'Operator tidak memiliki izin untuk mengubah data utama Personel.' });
        }

        let targetSatkerId = parseInt(satkerId) || existingPersonel.satkerId;

        // Pastikan operator tidak memindahkan ke satker lain
        if (req.user.role === 'OPERATOR_SATKER' && targetSatkerId !== req.user.satkerId) {
            return res.status(403).json({ message: 'Anda tidak dapat memindahkan personel ke Satker lain.' });
        }

        // Kalkulasi Pensiun jika ada perubahan tanggal lahir atau pangkat
        let targetTanggalPensiun = existingPersonel.tanggalPensiun;
        const tglLahirVal = tanggalLahir ? new Date(tanggalLahir) : existingPersonel.tanggalLahir;

        if (tanggalLahir || pangkat) {
            const settingsMap = await loadAllSettings();
            const umurPensiun = getUmurPensiun(existingPersonel.jenisPegawai, settingsMap);
            targetTanggalPensiun = new Date(tglLahirVal);
            targetTanggalPensiun.setFullYear(targetTanggalPensiun.getFullYear() + umurPensiun);
        }

        const personel = await prisma.$transaction(async (tx) => {
            const p = await tx.personel.update({
                where: { id },
                data: {
                    namaLengkap: namaLengkap || undefined,
                    pangkat: pangkat || undefined,
                    jabatan: jabatan || undefined,
                    satkerId: targetSatkerId,
                    tanggalLahir: tanggalLahir ? tglLahirVal : undefined,
                    tanggalPensiun: targetTanggalPensiun,
                    catatanRevisi: null // Reset catatan revisi setelah diperbaiki operator
                }
            });

            await tx.auditLog.create({
                data: {
                    userId: req.user.id,
                    aksi: 'UPDATE_PERSONEL',
                    targetId: id,
                    deskripsi: `Mengedit data Personel (${existingPersonel.namaLengkap} - NRP/NIP: ${existingPersonel.nrpNip})`,
                    alasan: 'Update data profil / jabatan'
                }
            });

            return p;
        });

        res.json({ message: 'Data personel berhasil diupdate', data: personel });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
}

// Delete Personel (Soft Delete & Audit Log)
const deletePersonel = async (req, res) => {
    try {
        const { id } = req.params;
        const { alasan, statusKeaktifan } = req.body;

        if (!alasan || alasan.trim() === '') {
            return res.status(400).json({ message: 'Alasan penghapusan wajib diisi demi keamanan Audit Log.' });
        }
        if (!statusKeaktifan || !['MENINGGAL_DUNIA', 'PENSIUN', 'DIHAPUS', 'TIDAK AKTIF (PTDH)'].includes(statusKeaktifan)) {
            return res.status(400).json({ message: 'Status keaktifan (Meninggal Dunia / Pensiun / PTDH / Dihapus) wajib dipilih.' });
        }

        const existingPersonel = await prisma.personel.findUnique({ where: { id } });
        if (!existingPersonel || existingPersonel.deletedAt) return res.status(404).json({ message: 'Personel tidak ditemukan atau sudah dihapus.' });

        // Pengecekan Akses Operator
        if (req.user.role === 'OPERATOR_SATKER' && existingPersonel.satkerId !== req.user.satkerId) {
            return res.status(403).json({ message: 'Akses ditolak.' });
        }

        // Soft Delete: Ganti nrpNip menjadi prefix DEL_[waktu]_[NIPLama] 
        // untuk membebaskan ruang duplikasi bagi pendaftar baru. 
        // Lalu, simpan `statusKeaktifan`
        const deletedNrp = `DEL_${Date.now()}_${existingPersonel.nrpNip}`;

        await prisma.$transaction([
            prisma.personel.update({
                where: { id },
                data: {
                    deletedAt: new Date(),
                    nrpNip: deletedNrp,
                    statusKeaktifan: statusKeaktifan
                }
            }),
            prisma.auditLog.create({
                data: {
                    userId: req.user.id,
                    aksi: 'DELETE_PERSONEL',
                    targetId: id,
                    deskripsi: `Menghapus Personel (${existingPersonel.namaLengkap} - NRP/NIP: ${existingPersonel.nrpNip})`,
                    alasan: alasan
                }
            })
        ]);

        res.json({ message: 'Data personel berhasil dihapus (Soft Delete).' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
}

// Restore Personel (Undo Soft Delete)
const restorePersonel = async (req, res) => {
    try {
        const { id } = req.params;
        const { alasan } = req.body;

        if (!alasan || alasan.trim() === '') {
            return res.status(400).json({ message: 'Alasan pengaktifan kembali wajib diisi.' });
        }

        if (req.user.role !== 'ADMIN_POLDA') {
            return res.status(403).json({ message: 'Hanya Admin Polda yang dapat mengaktifkan kembali personel.' });
        }

        const existingPersonel = await prisma.personel.findUnique({ where: { id } });
        if (!existingPersonel) return res.status(404).json({ message: 'Personel tidak ditemukan.' });

        if (!existingPersonel.deletedAt && existingPersonel.statusKeaktifan === 'AKTIF') {
            return res.status(400).json({ message: 'Personel ini sudah berada dalam status Aktif.' });
        }

        // Ekstraksi NRP asli (hapus 'DEL_timestamp_')
        let originalNrp = existingPersonel.nrpNip;
        if (originalNrp.startsWith('DEL_')) {
            const parts = originalNrp.split('_');
            if (parts.length >= 3) {
                parts.splice(0, 2); // buang DEL dan timestamp
                originalNrp = parts.join('_');
            }
        }

        // Cek apakah NRP asli sudah dipakai lagi oleh pendaftar baru
        const nrpNipTaken = await prisma.personel.findFirst({
            where: {
                nrpNip: originalNrp,
                deletedAt: null,
                id: { not: id } // Pengecualian diri sendiri
            }
        });

        if (nrpNipTaken) {
             return res.status(400).json({ message: `Gagal: NRP/NIP ${originalNrp} saat ini sedang dipakai oleh personel aktif lain di sistem.` });
        }

        await prisma.$transaction([
            prisma.personel.update({
                where: { id },
                data: {
                    deletedAt: null,
                    nrpNip: originalNrp,
                    statusKeaktifan: 'AKTIF'
                }
            }),
            prisma.auditLog.create({
                data: {
                    userId: req.user.id,
                    aksi: 'RESTORE_PERSONEL',
                    targetId: id,
                    deskripsi: `Mengaktifkan kembali Personel (${existingPersonel.namaLengkap} - NRP/NIP: ${originalNrp})`,
                    alasan: alasan
                }
            })
        ]);

        res.json({ message: 'Data personel berhasil dipulihkan menjadi Aktif.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
}

// Admin Approval: Setujui Personel Baru
const approvePersonel = async (req, res) => {
    try {
        const { id } = req.params;
        if (req.user.role !== 'ADMIN_POLDA') return res.status(403).json({ message: 'Hanya Admin Polda yang dapat menyetujui data.' });

        await prisma.$transaction(async (tx) => {
            const p = await tx.personel.findUnique({ where: { id } });
            if (!p) throw new Error('Data tidak ditemukan');

            await tx.personel.update({
                where: { id },
                data: {
                    isDraft: false,
                    catatanRevisi: null // Bersihkan catatan jika disetujui
                }
            });

            await tx.auditLog.create({
                data: {
                    userId: req.user.id,
                    aksi: 'APPROVE_PERSONEL',
                    targetId: id,
                    deskripsi: `Menyetujui pendaftaran Personel baru (${p.namaLengkap} - NRP/NIP: ${p.nrpNip})`,
                    alasan: 'Data valid sesuai verifikasi Admin'
                }
            });
        });

        res.json({ message: 'Data personel berhasil disetujui.' });
    } catch (error) {
        res.status(500).json({ message: 'Gagal menyetujui data.' });
    }
}

// Reject/Revision Draft
const rejectPersonel = async (req, res) => {
    try {
        const { id } = req.params;
        const { catatanRevisi } = req.body;

        if (req.user.role !== 'ADMIN_POLDA') return res.status(403).json({ message: 'Hanya Admin Polda yang dapat menolak data.' });
        if (!catatanRevisi) return res.status(400).json({ message: 'Catatan revisi wajib diisi jika menolak data.' });

        await prisma.$transaction(async (tx) => {
            const p = await tx.personel.findUnique({ where: { id } });
            if (!p) throw new Error('Data tidak ditemukan');

            await tx.personel.update({
                where: { id },
                data: { catatanRevisi: catatanRevisi }
            });

            await tx.auditLog.create({
                data: {
                    userId: req.user.id,
                    aksi: 'REJECT_PERSONEL',
                    targetId: id,
                    deskripsi: `Mengembalikan draft Personel untuk revisi (${p.namaLengkap} - NRP/NIP: ${p.nrpNip})`,
                    alasan: catatanRevisi
                }
            });
        });

        res.json({ message: 'Draft personel dikembalikan untuk revisi.' });
    } catch (error) {
        res.status(500).json({ message: 'Gagal memproses penolakan.' });
    }
}


// Cek Ketersediaan NRP/NIP Realtime
const checkNrpNipAvailability = async (req, res) => {
    try {
        const { nrpNip } = req.params;
        const existingPersonel = await prisma.personel.findUnique({
            where: { nrpNip },
            select: { namaLengkap: true }
        });

        if (existingPersonel) {
            return res.json({ available: false, name: existingPersonel.namaLengkap });
        }
        return res.json({ available: true });
    } catch (error) {
        return res.status(500).json({ message: 'Terjadi kesalahan cek status DB.' });
    }
};

module.exports = {
    createPersonel,
    getAllPersonel,
    getPersonelById,
    updatePersonel,
    deletePersonel,
    restorePersonel,
    approvePersonel,
    rejectPersonel,
    checkNrpNipAvailability
};
