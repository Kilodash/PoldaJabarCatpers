const prisma = require('../prisma');

// Helper fungsi validasi
const isNrpNipValidAsync = async (jenisPegawai, nrpNip) => {
    let requiredLength = jenisPegawai === 'POLRI' ? 8 : 18;
    if (jenisPegawai === 'POLRI') {
        const setPolri = await prisma.pengaturan.findUnique({ where: { key: 'PANJANG_NRP_POLRI' } });
        if (setPolri && setPolri.value) requiredLength = parseInt(setPolri.value);
        const regex = new RegExp(`^\\d{${requiredLength}}$`);
        if (!regex.test(nrpNip)) return false;
        if (nrpNip.length >= 4) {
            const mm = parseInt(nrpNip.substring(2, 4));
            if (mm < 1 || mm > 12) return false;
        }
        return true;
    } else {
        const setPns = await prisma.pengaturan.findUnique({ where: { key: 'PANJANG_NIP_PNS' } });
        if (setPns && setPns.value) requiredLength = parseInt(setPns.value);
        const regex = new RegExp(`^\\d{${requiredLength}}$`);
        if (!regex.test(nrpNip)) return false;
        if (nrpNip.length >= 8) {
            const mm = parseInt(nrpNip.substring(4, 6));
            const dd = parseInt(nrpNip.substring(6, 8));
            if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return false;
        }
        return true;
    }
};

const getUmurPensiunAsync = async (jenisPegawai, pangkat) => {
    const key = jenisPegawai === 'POLRI' ? 'USIA_PENSIUN_POLRI' : 'USIA_PENSIUN_PNS';
    const setting = await prisma.pengaturan.findUnique({ where: { key } });
    if (setting && setting.value) {
        return parseInt(setting.value);
    }
    return 58; // Default fallback
};


// Tambah Personel
const createPersonel = async (req, res) => {
    try {
        const { jenisPegawai, nrpNip, namaLengkap, pangkat, jabatan, satkerId, tanggalLahir } = req.body;

        // Validasi Jenis Pegawai
        if (!['POLRI', 'PNS'].includes(jenisPegawai)) {
            return res.status(400).json({ message: 'Jenis Pegawai tidak valid (POLRI/PNS).' });
        }

        // Validasi NRP/NIP Dinamis
        const isValidFormat = await isNrpNipValidAsync(jenisPegawai, nrpNip);
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
        const settingUmurMin = await prisma.pengaturan.findUnique({ where: { key: keyUsiaMin } });
        const umurMinimal = settingUmurMin && settingUmurMin.value ? parseInt(settingUmurMin.value) : 18;

        if (age < umurMinimal) {
            return res.status(400).json({ message: `Usia tidak wajar (Belum mencapai batas minimal ${umurMinimal} tahun).` });
        }

        const umurPensiun = await getUmurPensiunAsync(jenisPegawai, pangkat);
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

        const personel = await prisma.personel.create({
            data: {
                jenisPegawai,
                nrpNip,
                namaLengkap,
                pangkat,
                jabatan,
                satkerId: targetSatkerId,
                tanggalLahir: tglLahir,
                tanggalPensiun: tanggalPensiunObj
            }
        });

        res.status(201).json({ message: 'Data personel berhasil ditambahkan', data: personel });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
};

// Ambil semua Personel dengan Filter
const getAllPersonel = async (req, res) => {
    try {
        let whereClause = {};

        // Filter berdasarkan Role
        if (req.user.role === 'OPERATOR_SATKER') {
            whereClause.satkerId = req.user.satkerId;
        }

        // Filter tambahan dari query params jika ada
        if (req.query.satkerId && req.user.role === 'ADMIN_POLDA') {
            whereClause.satkerId = parseInt(req.query.satkerId);
        }
        if (req.query.jenisPegawai) {
            whereClause.jenisPegawai = req.query.jenisPegawai;
        }
        // Default: TAMPILKAN YANG BELUM DIHAPUS SAJA
        whereClause.deletedAt = null;

        if (req.query.search) {
            whereClause.OR = [
                { namaLengkap: { contains: req.query.search } },
                { nrpNip: { contains: req.query.search } }
            ]
        }

        // Filter Category untuk Drill-down Dashboard
        if (req.query.category) {
            const cat = req.query.category;
            const currentDate = new Date();

            if (cat === 'tidakAktif') {
                // khusus kategori ini, kita harus mencabut filter "TIDAK DIHAPUS"
                delete whereClause.deletedAt;
                whereClause.OR = [
                    { tanggalPensiun: { lte: currentDate } },
                    { statusKeaktifan: { not: 'AKTIF' } },
                    { deletedAt: { not: null } }
                ];
            } else if (cat === 'catpersAktif') {
                whereClause.pelanggaran = {
                    some: {
                        deletedAt: null,
                        OR: [
                            { statusPenyelesaian: 'PROSES' },
                            {
                                statusPenyelesaian: 'MENJALANI_HUKUMAN',
                                tanggalRekomendasi: null
                            }
                        ]
                    }
                };
            } else if (cat === 'pernahTercatat') {
                whereClause.pelanggaran = {
                    some: {
                        deletedAt: null,
                        statusPenyelesaian: 'MENJALANI_HUKUMAN',
                        tanggalRekomendasi: { not: null }
                    }
                };
            } else if (cat === 'belumRps') {
                whereClause.pelanggaran = {
                    some: {
                        deletedAt: null,
                        statusPenyelesaian: { in: ['TIDAK_TERBUKTI', 'MENJALANI_HUKUMAN'] },
                        tanggalRekomendasi: null
                    }
                };
            } else if (cat === 'perdamaian') {
                whereClause.pelanggaran = { some: { statusPenyelesaian: 'PERDAMAIAN', deletedAt: null } };
            }
        }

        const listPersonel = await prisma.personel.findMany({
            where: whereClause,
            include: {
                satker: true,
                pelanggaran: { where: { deletedAt: null } },
                _count: {
                    select: { pelanggaran: { where: { deletedAt: null } } }
                }
            },
            orderBy: { namaLengkap: 'asc' }
        });

        const formattedPersonel = listPersonel.map(p => {
            let statusPersonel = 'Tidak Ada Catatan';
            let statusRps = '-';

            if (p.pelanggaran && p.pelanggaran.length > 0) {
                let maxSeverity = 0; // 0: tidak, 1: pernah, 2: ada
                let adaBelumRps = false;
                const currentDate = new Date();

                for (let v of p.pelanggaran) {
                    let s = 0;
                    if (v.statusPenyelesaian === 'PROSES') {
                        s = 2;
                        // Proses belum butuh RPS karena belum ada putusan sidang
                    } else if (v.statusPenyelesaian === 'MENJALANI_HUKUMAN') {
                        if (v.tanggalRekomendasi) {
                            s = 1; // Sudah lewat RPS (Pernah Tercatat)
                        } else {
                            s = 2; // Aktif (Proses sidang belum punya RPS)
                            adaBelumRps = true;
                        }
                    } else if (v.statusPenyelesaian === 'TIDAK_TERBUKTI') {
                        s = 0; // Tidak terhitung Aktif
                        if (!v.tanggalRekomendasi) {
                            adaBelumRps = true; // Tapi WAJIB lampirkan RPS SP3
                        }
                    } else if (v.statusPenyelesaian === 'PERDAMAIAN') {
                        s = 0; // Tidak wajib apa-apa
                    }

                    if (s > maxSeverity) maxSeverity = s;
                }

                if (maxSeverity === 2) statusPersonel = 'Ada Catatan';
                else if (maxSeverity === 1) statusPersonel = 'Pernah Tercatat';
                else statusPersonel = 'Tidak Ada Catatan';

                statusRps = adaBelumRps ? 'Belum Ada RPS' : 'Sudah Ada RPS';
                if (maxSeverity === 0) statusRps = '-'; // Tidak relevan untuk personel bersih & SP3
            }

            const { pelanggaran, ...rest } = p;
            return {
                ...rest,
                statusPersonel,
                statusRps
            };
        });

        res.json(formattedPersonel);
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
                    where: { deletedAt: null },
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
        const { pangkat, jabatan, satkerId } = req.body;

        const existingPersonel = await prisma.personel.findUnique({ where: { id } });
        if (!existingPersonel) return res.status(404).json({ message: 'Personel tidak ditemukan.' });

        // Pengecekan Akses Operator
        if (req.user.role === 'OPERATOR_SATKER' && existingPersonel.satkerId !== req.user.satkerId) {
            return res.status(403).json({ message: 'Akses ditolak.' });
        }

        let targetSatkerId = parseInt(satkerId) || existingPersonel.satkerId;

        // Pastikan operator tidak memindahkan ke satker lain
        if (req.user.role === 'OPERATOR_SATKER' && targetSatkerId !== req.user.satkerId) {
            return res.status(403).json({ message: 'Anda tidak dapat memindahkan personel ke Satker lain.' });
        }

        const personel = await prisma.personel.update({
            where: { id },
            data: {
                pangkat: pangkat || undefined,
                jabatan: jabatan || undefined,
                satkerId: targetSatkerId
            }
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
        if (!statusKeaktifan || !['MENINGGAL_DUNIA', 'PENSIUN', 'DIHAPUS'].includes(statusKeaktifan)) {
            return res.status(400).json({ message: 'Status keaktifan (Meninggal Dunia / Pensiun / Dihapus) wajib dipilih.' });
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
    checkNrpNipAvailability
};
