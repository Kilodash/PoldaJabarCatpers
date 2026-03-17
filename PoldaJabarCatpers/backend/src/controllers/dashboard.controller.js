const prisma = require('../prisma');

const getDashboardStats = async (req, res) => {
    try {
        let satkerFilter = {};

        if (req.user.role === 'OPERATOR_SATKER') {
            satkerFilter = { satkerId: req.user.satkerId };
        } else if (req.query.satkerId) {
            satkerFilter = { satkerId: parseInt(req.query.satkerId) };
        }

        const currentDate = new Date();

        const pelanggaranFilter = req.user.role === 'OPERATOR_SATKER' || req.query.satkerId ? {
            deletedAt: null,
            isDraft: false,
            personel: {
                satkerId: req.user.role === 'OPERATOR_SATKER' ? req.user.satkerId : parseInt(req.query.satkerId),
                deletedAt: null,
                statusKeaktifan: 'AKTIF'
            }
        } : {
            deletedAt: null,
            isDraft: false,
            personel: { deletedAt: null, statusKeaktifan: 'AKTIF' }
        };

        // Jalankan semua 10 query secara PARALEL dengan Promise.all
        const [
            totalPersonel,
            tidakAktif,
            perdamaian,
            pernahTercatat,
            tidakTerbukti,
            belumSktt,
            belumSktb,
            belumRps,
            catpersAktif,
            butuhApprovalPersonel,
            butuhApprovalPelanggaran
        ] = await Promise.all([
            // 1. Jumlah Personel Aktif
            prisma.personel.count({
                where: { ...satkerFilter, deletedAt: null, isDraft: false, statusKeaktifan: 'AKTIF' }
            }),
            // 2. Personel Tidak Aktif
            prisma.personel.count({
                where: {
                    ...satkerFilter,
                    OR: [
                        { tanggalPensiun: { lte: currentDate } },
                        { statusKeaktifan: { not: 'AKTIF' } },
                        { deletedAt: { not: null } }
                    ],
                    isDraft: false
                }
            }),
            // 3. Perdamaian
            prisma.pelanggaran.count({
                where: { ...pelanggaranFilter, statusPenyelesaian: 'PERDAMAIAN' }
            }),
            // 4. Pernah Tercatat
            prisma.pelanggaran.count({
                where: {
                    ...pelanggaranFilter,
                    statusPenyelesaian: { in: ['MENJALANI_HUKUMAN', 'SIDANG'] },
                    tanggalRekomendasi: { not: null }
                }
            }),
            // 5. Tidak Terbukti
            prisma.pelanggaran.count({
                where: { ...pelanggaranFilter, statusPenyelesaian: 'TIDAK_TERBUKTI' }
            }),
            // 6. Belum SKTT
            prisma.pelanggaran.count({
                where: { ...pelanggaranFilter, statusPenyelesaian: 'Belum ada SKTT' }
            }),
            // 7. Belum SKTB
            prisma.pelanggaran.count({
                where: { ...pelanggaranFilter, statusPenyelesaian: 'Belum ada SKTB' }
            }),
            // 8. Belum RPS
            prisma.pelanggaran.count({
                where: {
                    ...pelanggaranFilter,
                    statusPenyelesaian: { in: ['MENJALANI_HUKUMAN', 'SIDANG'] },
                    tanggalRekomendasi: null,
                    tanggalBisaAjukanRps: { lte: currentDate }
                }
            }),
            // 9. Catpers Aktif
            prisma.pelanggaran.count({
                where: {
                    ...pelanggaranFilter,
                    OR: [
                        { statusPenyelesaian: 'PROSES' },
                        {
                            statusPenyelesaian: { in: ['MENJALANI_HUKUMAN', 'SIDANG'] },
                            tanggalRekomendasi: null,
                            OR: [
                                { tanggalBisaAjukanRps: null },
                                { tanggalBisaAjukanRps: { gt: currentDate } }
                            ]
                        }
                    ]
                }
            }),
            // 10. Butuh Approval Personel
            prisma.personel.count({
                where: { ...satkerFilter, isDraft: true, deletedAt: null }
            }),
            // 11. Butuh Approval Pelanggaran
            prisma.pelanggaran.count({
                where: {
                    deletedAt: null,
                    isDraft: true,
                    personel: { ...satkerFilter, deletedAt: null }
                }
            })
        ]);

        res.json({
            stats: {
                totalPersonel,
                tidakAktif,
                catpersAktif,
                pernahTercatat,
                belumRps,
                belumRekomendasi: belumRps,
                perdamaian,
                tidakTerbukti,
                belumSktt,
                belumSktb,
                butuhApproval: butuhApprovalPersonel + butuhApprovalPelanggaran,
                isSubmitting: false
            }
        });

    } catch (error) {
        console.error('Dashboard Stats Error:', error);
        res.status(500).json({ message: 'Terjadi kesalahan server.' });
    }
};

const getSatkerStats = async (req, res) => {
    try {
        const currentDate = new Date();
        const listSatkerRaw = await prisma.satker.findMany({
            select: { id: true, nama: true, urutan: true }
        });

        // 1. Group Count Personel per Satker (Aktif only)
        const personelCounts = await prisma.personel.groupBy({
            by: ['satkerId'],
            where: {
                deletedAt: null,
                isDraft: false,
                statusKeaktifan: 'AKTIF',
                tanggalPensiun: { gt: currentDate }
            },
            _count: { id: true }
        });

        // 2. Group Count Tidak Aktif per Satker
        const tidakAktifCounts = await prisma.personel.groupBy({
            by: ['satkerId'],
            where: {
                deletedAt: null,
                isDraft: false,
                OR: [
                    { statusKeaktifan: { not: 'AKTIF' } },
                    { tanggalPensiun: { lte: currentDate } }
                ]
            },
            _count: { id: true }
        });

        // 3. Group Count Butuh Approval (Personel Draft)
        const approvalPersonelCounts = await prisma.personel.groupBy({
            by: ['satkerId'],
            where: { isDraft: true, deletedAt: null },
            _count: { id: true }
        });

        // 4. Group Count Pelanggaran per Satker & Satkes (Status-based)
        // Note: For complex counts, we might still need to process some data, but let's try to group more effectively
        const violationStats = await prisma.pelanggaran.groupBy({
            by: ['statusPenyelesaian'],
            where: { 
                isDraft: false, 
                deletedAt: null,
                personel: { statusKeaktifan: 'AKTIF', deletedAt: null, tanggalPensiun: { gt: currentDate } }
            },
            _count: { id: true }
        });

        // 5. Special condition counts for per-satker details
        // We fetch counts for specific important status per satker
        const satkerViolationCounts = await prisma.pelanggaran.groupBy({
            by: ['personelId', 'statusPenyelesaian'],
            where: { 
                isDraft: false, 
                deletedAt: null,
                personel: { statusKeaktifan: 'AKTIF', deletedAt: null, tanggalPensiun: { gt: currentDate } }
            },
            _count: { id: true }
        });

        // Since prisma groupBy doesn't support nested where with specific logic easily for multiple columns
        // Let's use a slightly more optimized manual approach but with database counts for bulk
        
        // RE-FETCH list satker stats but with better mapping
        const statsMap = listSatkerRaw.reduce((acc, s) => {
            acc[s.id] = {
                id: s.id, nama: s.nama, urutan: s.urutan,
                totalPersonel: 0, tidakAktif: 0, catpersAktif: 0,
                pernahTercatat: 0, belumRekomendasi: 0, belumRps: 0,
                perdamaian: 0, tidakTerbukti: 0, belumSktt: 0,
                belumSktb: 0, butuhApproval: 0
            };
            return acc;
        }, {});

        personelCounts.forEach(c => { if (statsMap[c.satkerId]) statsMap[c.satkerId].totalPersonel = c._count.id; });
        tidakAktifCounts.forEach(c => { if (statsMap[c.satkerId]) statsMap[c.satkerId].tidakAktif = c._count.id; });
        approvalPersonelCounts.forEach(c => { if (statsMap[c.satkerId]) statsMap[c.satkerId].butuhApproval += c._count.id; });

        // For violation details, we still need Satker-level aggregation
        // To avoid N+1 or fetching all, we use a more targeted findMany
        const pelanggaranDetails = await prisma.pelanggaran.findMany({
            where: {
                deletedAt: null,
                personel: { statusKeaktifan: 'AKTIF', deletedAt: null, tanggalPensiun: { gt: currentDate } }
            },
            select: {
                isDraft: true,
                statusPenyelesaian: true,
                tanggalRekomendasi: true,
                tanggalBisaAjukanRps: true,
                personel: { select: { satkerId: true } }
            }
        });

        pelanggaranDetails.forEach(pl => {
            const s = statsMap[pl.personel.satkerId];
            if (!s) return;

            if (pl.isDraft) {
                s.butuhApproval++;
                return;
            }

            const status = pl.statusPenyelesaian;
            if (status === 'PERDAMAIAN') s.perdamaian++;
            else if (status === 'TIDAK_TERBUKTI') s.tidakTerbukti++;
            else if (status === 'Belum ada SKTT') s.belumSktt++;
            else if (status === 'Belum ada SKTB') s.belumSktb++;
            else if (['MENJALANI_HUKUMAN', 'SIDANG'].includes(status)) {
                if (pl.tanggalRekomendasi) {
                    s.pernahTercatat++;
                } else {
                    if (pl.tanggalBisaAjukanRps && pl.tanggalBisaAjukanRps <= currentDate) {
                        s.belumRps++;
                        s.belumRekomendasi++;
                    } else {
                        s.catpersAktif++;
                    }
                }
            } else if (status === 'PROSES') {
                s.catpersAktif++;
            }
        });

        let data = Object.values(statsMap);

        if (req.user.role === 'OPERATOR_SATKER') {
            data = data.filter(d => d.id === req.user.satkerId);
        } else if (req.query.satkerId) {
            data = data.filter(d => d.id === parseInt(req.query.satkerId));
        }

        const priority = (nama) => {
            const n = nama.toLowerCase();
            if (nama === 'Polda Jabar') return 0;
            if (n.startsWith('spripim')) return 1;
            if (n.startsWith('itwasda')) return 2;
            if (n.startsWith('ro ops')) return 3;
            if (n.startsWith('rorena') || n.startsWith('ro rena')) return 4;
            if (n.startsWith('ro sdm')) return 5;
            if (n.startsWith('ro log') || n.startsWith('ro sarpras')) return 6;
            if (n.startsWith('ditintelkam') || n.startsWith('dit intelkam')) return 7;
            if (n.startsWith('ditlantas') || n.startsWith('dit lantas')) return 8;
            if (n.startsWith('ditsamapta') || n.startsWith('dit sabhara')) return 9;
            if (n.startsWith('ditreskrimum') || n.startsWith('dit reskrimum')) return 10;
            if (n.startsWith('ditreskrimsus') || n.startsWith('dit reskrimsus')) return 11;
            if (n.startsWith('ditresnarkoba') || n.startsWith('dit resnarkoba')) return 12;
            if (n.startsWith('ditpamobvit') || n.startsWith('dit pamobvit')) return 13;
            if (n.startsWith('ditpolair') || n.startsWith('dit polair')) return 14;
            if (n.startsWith('ditbinmas') || n.startsWith('dit binmas')) return 15;
            if (n.startsWith('dittahti') || n.startsWith('dit tahti')) return 16;
            if (n.startsWith('ditressiber')) return 17;
            if (n.startsWith('ditres ppa')) return 18;
            if (n.startsWith('bidkeu') || n.startsWith('bid keu')) return 19;
            if (n.startsWith('biddokkes') || n.startsWith('bid dokkes')) return 20;
            if (n.startsWith('bid t') || n.startsWith('bidtik')) return 21;
            if (n.startsWith('bidhumas') || n.startsWith('bid humas')) return 22;
            if (n.startsWith('bidkum') || n.startsWith('bid kum')) return 23;
            if (n.startsWith('bidpropam') || n.startsWith('bid propam')) return 24;
            if (n.startsWith('yanma')) return 25;
            if (n.startsWith('setum')) return 26;
            if (n.startsWith('spn')) return 27;
            if (n.startsWith('rs polri') || n.startsWith('rumah sakit')) return 28;
            if (n.startsWith('satbrimob')) return 29;
            if (n.startsWith('spkt')) return 30;
            if (n.startsWith('polrestabes')) return 31;
            if (n.startsWith('polresta ')) return 32;
            if (n.startsWith('polres')) return 33;
            return 40;
        };

        data.sort((a, b) => {
            if (a.urutan !== 0 || b.urutan !== 0) {
                const oa = a.urutan || 999;
                const ob = b.urutan || 999;
                if (oa !== ob) return oa - ob;
            }
            const pa = priority(a.nama);
            const pb = priority(b.nama);
            if (pa !== pb) return pa - pb;
            return a.nama.localeCompare(b.nama, 'id');
        });

        // Cache-Control: data satker stats bisa di-cache 60 detik
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
        res.json(data);
    } catch (error) {
        console.error('Satker Stats Error:', error);
        res.status(500).json({ message: 'Terjadi kesalahan server.' });
    }
};

module.exports = { getDashboardStats, getSatkerStats };
