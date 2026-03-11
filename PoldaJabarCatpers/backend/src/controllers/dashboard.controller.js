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
            where: { ...satkerFilter, deletedAt: null, isDraft: false }
        });

        // 2. Personel Tidak Aktif
        const tidakAktif = await prisma.personel.count({
            where: {
                ...satkerFilter,
                OR: [
                    { tanggalPensiun: { lte: currentDate } },
                    { statusKeaktifan: { not: 'AKTIF' } },
                    { deletedAt: { not: null } }
                ],
                isDraft: false
            }
        });

        const pelanggaranFilter = req.user.role === 'OPERATOR_SATKER' || req.query.satkerId ? {
            deletedAt: null,
            isDraft: false,
            personel: {
                satkerId: req.user.role === 'OPERATOR_SATKER' ? req.user.satkerId : parseInt(req.query.satkerId),
                deletedAt: null
            }
        } : {
            deletedAt: null,
            isDraft: false,
            personel: { deletedAt: null }
        };

        // 3. Perdamaian
        const perdamaian = await prisma.pelanggaran.count({
            where: { ...pelanggaranFilter, statusPenyelesaian: 'PERDAMAIAN' }
        });

        // 4. Pernah Tercatat
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

        // 7. Butuh Approval (Hanya Personel & Pelanggaran yang isDraft=true)
        const butuhApprovalPersonel = await prisma.personel.count({
            where: { ...satkerFilter, isDraft: true, deletedAt: null }
        });
        const butuhApprovalPelanggaran = await prisma.pelanggaran.count({
            where: {
                deletedAt: null,
                isDraft: true,
                personel: {
                    ...satkerFilter,
                    deletedAt: null
                }
            }
        });

        res.json({
            stats: {
                totalPersonel,
                tidakAktif,
                catpersAktif,
                pernahTercatat,
                belumRps,
                perdamaian,
                butuhApproval: butuhApprovalPersonel + butuhApprovalPelanggaran
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

            const totalPersonel = await prisma.personel.count({ where: { satkerId, deletedAt: null, isDraft: false } });

            const tidakAktif = await prisma.personel.count({
                where: {
                    satkerId,
                    OR: [
                        { tanggalPensiun: { lte: currentDate } },
                        { statusKeaktifan: { not: 'AKTIF' } },
                        { deletedAt: { not: null } }
                    ],
                    isDraft: false
                }
            });

            const perdamaian = await prisma.pelanggaran.count({
                where: { deletedAt: null, isDraft: false, personel: { satkerId, deletedAt: null }, statusPenyelesaian: 'PERDAMAIAN' }
            });

            const pernahTercatat = await prisma.pelanggaran.count({
                where: {
                    deletedAt: null,
                    isDraft: false,
                    personel: { satkerId, deletedAt: null },
                    statusPenyelesaian: 'MENJALANI_HUKUMAN',
                    tanggalRekomendasi: { not: null }
                }
            });

            const belumRps = await prisma.pelanggaran.count({
                where: {
                    deletedAt: null,
                    isDraft: false,
                    personel: { satkerId, deletedAt: null },
                    statusPenyelesaian: { in: ['TIDAK_TERBUKTI', 'MENJALANI_HUKUMAN'] },
                    tanggalRekomendasi: null
                }
            });

            const catpersAktif = await prisma.pelanggaran.count({
                where: {
                    deletedAt: null,
                    isDraft: false,
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

            const butuhApproval = (await prisma.personel.count({ where: { satkerId, isDraft: true, deletedAt: null } })) +
                (await prisma.pelanggaran.count({ where: { isDraft: true, deletedAt: null, personel: { satkerId, deletedAt: null } } }));

            return {
                id: satker.id,
                nama: satker.nama,
                totalPersonel,
                tidakAktif,
                catpersAktif,
                pernahTercatat,
                belumRps,
                perdamaian,
                butuhApproval
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
