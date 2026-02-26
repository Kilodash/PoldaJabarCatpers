const prisma = require('../prisma');

const getDashboardStats = async (req, res) => {
    try {
        let satkerFilter = {};

        // Jika Operator, hanya ambil data satkernya sendiri
        if (req.user.role === 'OPERATOR_SATKER') {
            satkerFilter = { satkerId: req.user.satkerId };
        } else if (req.query.satkerId) {
            // Admin bisa filter by satker
            satkerFilter = { satkerId: parseInt(req.query.satkerId) };
        }

        const currentDate = new Date();

        // 1. Jumlah Personel (Yang Masih Aktif)
        const totalPersonel = await prisma.personel.count({
            where: { ...satkerFilter, deletedAt: null }
        });

        // 2. Personel Tidak Aktif
        // Personel dihitung "Tidak Aktif" jika:
        // a. Sudah masuk usia pensiun (tanggalPensiun <= currentDate)
        // ATAU b. Telah di-SoftDelete (statusKeaktifan != 'AKTIF')
        const tidakAktif = await prisma.personel.count({
            where: {
                ...satkerFilter,
                OR: [
                    { tanggalPensiun: { lte: currentDate } },
                    { statusKeaktifan: { not: 'AKTIF' } },
                    { deletedAt: { not: null } }
                ]
            }
        });

        const pelanggaranFilter = req.user.role === 'OPERATOR_SATKER' || req.query.satkerId ? {
            deletedAt: null,
            personel: {
                satkerId: req.user.role === 'OPERATOR_SATKER' ? req.user.satkerId : parseInt(req.query.satkerId),
                deletedAt: null
            }
        } : {
            deletedAt: null,
            personel: { deletedAt: null }
        };

        // 3. Perdamaian
        const perdamaian = await prisma.pelanggaran.count({
            where: { ...pelanggaranFilter, statusPenyelesaian: 'PERDAMAIAN' }
        });

        // 4. Pernah Tercatat (Sudah Menjalankan Hukuman)
        const pernahTercatat = await prisma.pelanggaran.count({
            where: {
                ...pelanggaranFilter,
                statusPenyelesaian: 'MENJALANI_HUKUMAN',
                tanggalRekomendasi: { not: null }
            }
        });

        // 5. Belum Mengajukan RPS 
        const belumRps = await prisma.pelanggaran.count({
            where: {
                ...pelanggaranFilter,
                statusPenyelesaian: { in: ['TIDAK_TERBUKTI', 'MENJALANI_HUKUMAN'] },
                tanggalRekomendasi: null
            }
        });

        // 6. Catpers Aktif
        const catpersAktif = await prisma.pelanggaran.count({
            where: {
                ...pelanggaranFilter,
                OR: [
                    { statusPenyelesaian: 'PROSES' },
                    {
                        statusPenyelesaian: 'MENJALANI_HUKUMAN',
                        tanggalRekomendasi: null
                    }
                ]
            }
        });

        res.json({
            stats: {
                totalPersonel,
                tidakAktif,
                catpersAktif,
                pernahTercatat,
                belumRps,
                perdamaian
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan server.' });
    }
};

const getSatkerStats = async (req, res) => {
    try {
        let satkerFilter = {};
        if (req.user.role === 'OPERATOR_SATKER') {
            satkerFilter = { id: req.user.satkerId };
        } else if (req.query.satkerId) {
            satkerFilter = { id: parseInt(req.query.satkerId) };
        }

        const listSatker = await prisma.satker.findMany({
            where: satkerFilter,
            orderBy: { id: 'asc' }
        });

        const currentDate = new Date();

        const satkerStatsPromises = listSatker.map(async (satker) => {
            const satkerId = satker.id;

            const totalPersonel = await prisma.personel.count({ where: { satkerId, deletedAt: null } });

            const tidakAktif = await prisma.personel.count({
                where: {
                    satkerId,
                    OR: [
                        { tanggalPensiun: { lte: currentDate } },
                        { statusKeaktifan: { not: 'AKTIF' } },
                        { deletedAt: { not: null } }
                    ]
                }
            });

            const perdamaian = await prisma.pelanggaran.count({
                where: { deletedAt: null, personel: { satkerId, deletedAt: null }, statusPenyelesaian: 'PERDAMAIAN' }
            });

            const pernahTercatat = await prisma.pelanggaran.count({
                where: {
                    deletedAt: null,
                    personel: { satkerId, deletedAt: null },
                    statusPenyelesaian: 'MENJALANI_HUKUMAN',
                    tanggalRekomendasi: { not: null }
                }
            });

            const belumRps = await prisma.pelanggaran.count({
                where: {
                    deletedAt: null,
                    personel: { satkerId, deletedAt: null },
                    statusPenyelesaian: { in: ['TIDAK_TERBUKTI', 'MENJALANI_HUKUMAN'] },
                    tanggalRekomendasi: null
                }
            });

            const catpersAktif = await prisma.pelanggaran.count({
                where: {
                    deletedAt: null,
                    personel: { satkerId, deletedAt: null },
                    OR: [
                        { statusPenyelesaian: 'PROSES' },
                        {
                            statusPenyelesaian: 'MENJALANI_HUKUMAN',
                            tanggalRekomendasi: null
                        }
                    ]
                }
            });

            return {
                id: satker.id,
                nama: satker.nama,
                totalPersonel,
                tidakAktif,
                catpersAktif,
                pernahTercatat,
                belumRps,
                perdamaian
            };
        });

        const data = await Promise.all(satkerStatsPromises);
        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan server.' });
    }
};

module.exports = { getDashboardStats, getSatkerStats };
