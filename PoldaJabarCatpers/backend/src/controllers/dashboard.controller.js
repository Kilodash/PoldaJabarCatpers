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
            where: { ...satkerFilter, deletedAt: null, isDraft: false, statusKeaktifan: 'AKTIF' }
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
                deletedAt: null,
                statusKeaktifan: 'AKTIF'
            }
        } : {
            deletedAt: null,
            isDraft: false,
            personel: { deletedAt: null, statusKeaktifan: 'AKTIF' }
        };

        // 3. Perdamaian
        const perdamaian = await prisma.pelanggaran.count({
            where: { ...pelanggaranFilter, statusPenyelesaian: 'PERDAMAIAN' }
        });

        // 4. Pernah Tercatat (Sidang/Hukuman dan sudah ada rekomendasi)
        const pernahTercatat = await prisma.pelanggaran.count({
            where: {
                ...pelanggaranFilter,
                statusPenyelesaian: { in: ['MENJALANI_HUKUMAN', 'SIDANG'] },
                tanggalRekomendasi: { not: null }
            }
        });

        // 4b. Tidak Terbukti (Final)
        const tidakTerbukti = await prisma.pelanggaran.count({
            where: {
                ...pelanggaranFilter,
                statusPenyelesaian: 'TIDAK_TERBUKTI'
            }
        });

        // 4c. Belum SKTT / SKTB
        const belumSktt = await prisma.pelanggaran.count({
            where: { ...pelanggaranFilter, statusPenyelesaian: 'Belum ada SKTT' }
        });
        const belumSktb = await prisma.pelanggaran.count({
            where: { ...pelanggaranFilter, statusPenyelesaian: 'Belum ada SKTB' }
        });

        // 5. Belum Rekomendasi (Hukuman/Sidang, sudah lewat tanggal rekomendasi, belum isi form)
        const belumRps = await prisma.pelanggaran.count({
            where: {
                ...pelanggaranFilter,
                statusPenyelesaian: { in: ['MENJALANI_HUKUMAN', 'SIDANG'] },
                tanggalRekomendasi: null,
                tanggalBisaAjukanRps: { lte: currentDate }
            }
        });

        // 6. Catpers Aktif (Proses, atau Hukuman/Sidang tapi belum lewat batas rekomendasinya)
        const catpersAktif = await prisma.pelanggaran.count({
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
                tidakTerbukti,
                belumSktt,
                belumSktb,
                butuhApproval: butuhApprovalPersonel + butuhApprovalPelanggaran,
                isSubmitting: false // Indikator ui jika dnd
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan server.' });
    }
};

const getSatkerStats = async (req, res) => {
    try {
        const listSatker = await prisma.satker.findMany({
            select: { id: true, nama: true, urutan: true }
        });

        const currentDate = new Date();

        // Fetch all personnel with their violations in one go
        const allPersonel = await prisma.personel.findMany({
            where: { deletedAt: null },
            include: {
                pelanggaran: {
                    where: { deletedAt: null }
                }
            }
        });

        const statsMap = listSatker.reduce((acc, s) => {
            acc[s.id] = {
                id: s.id,
                nama: s.nama,
                urutan: s.urutan,
                totalPersonel: 0,
                tidakAktif: 0,
                catpersAktif: 0,
                pernahTercatat: 0,
                belumRekomendasi: 0,
                belumRps: 0,
                perdamaian: 0,
                tidakTerbukti: 0,
                belumSktt: 0,
                belumSktb: 0,
                butuhApproval: 0
            };
            return acc;
        }, {});

        allPersonel.forEach(p => {
            const s = statsMap[p.satkerId];
            if (!s) return;

            const isAktif = p.statusKeaktifan === 'AKTIF' && !p.isDraft && p.tanggalPensiun > currentDate;

            if (isAktif) {
                s.totalPersonel++;
            } else if (!p.isDraft) {
                s.tidakAktif++;
            }

            if (p.isDraft) {
                s.butuhApproval++;
            }

            p.pelanggaran.forEach(pl => {
                if (pl.isDraft) {
                    s.butuhApproval++;
                }

                if (!isAktif || pl.isDraft) return;

                const status = pl.statusPenyelesaian;
                
                if (status === 'PERDAMAIAN') s.perdamaian++;
                if (status === 'TIDAK_TERBUKTI') s.tidakTerbukti++;
                if (status === 'Belum ada SKTT') s.belumSktt++;
                if (status === 'Belum ada SKTB') s.belumSktb++;

                if (['MENJALANI_HUKUMAN', 'SIDANG'].includes(status)) {
                    if (pl.tanggalRekomendasi) {
                        s.pernahTercatat++;
                    } else {
                        // Belum RPS
                        if (pl.tanggalBisaAjukanRps && pl.tanggalBisaAjukanRps <= currentDate) {
                            s.belumRps++;
                            s.belumRekomendasi++;
                        } else {
                            // Masih proses atau belum lewat waktu
                            s.catpersAktif++;
                        }
                    }
                } else if (status === 'PROSES') {
                    s.catpersAktif++;
                }
            });
        });

        let data = Object.values(statsMap);

        // Filter if requested
        if (req.user.role === 'OPERATOR_SATKER') {
            data = data.filter(d => d.id === req.user.satkerId);
        } else if (req.query.satkerId) {
            data = data.filter(d => d.id === parseInt(req.query.satkerId));
        }

        // Custom sort hierarchy following specific order 
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
            // First priority: Manual Order (if not 0)
            if (a.urutan !== 0 || b.urutan !== 0) {
                const oa = a.urutan || 999;
                const ob = b.urutan || 999;
                if (oa !== ob) return oa - ob;
            }
            // Second priority: Hardcoded Hierarchy
            const pa = priority(a.nama);
            const pb = priority(b.nama);
            if (pa !== pb) return pa - pb;
            // Third priority: Alphabetical
            return a.nama.localeCompare(b.nama, 'id');
        });

        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan server.' });
    }
};

module.exports = { getDashboardStats, getSatkerStats };
