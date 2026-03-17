const prisma = require('../prisma');

const getAllAuditLogs = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';

        const skip = (page - 1) * limit;

        const whereClause = search ? {
            OR: [
                { aksi: { contains: search } },
                { deskripsi: { contains: search } },
                { alasan: { contains: search } },
                { user: { email: { contains: search } } },
                { user: { satker: { nama: { contains: search } } } }
            ]
        } : {};

        const [total, logs] = await prisma.$transaction([
            prisma.auditLog.count({ where: whereClause }),
            prisma.auditLog.findMany({
                where: whereClause,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                include: {
                    user: {
                        select: { email: true, role: true, satkerId: true, satker: { select: { nama: true } } }
                    }
                }
            })
        ]);

        // Transform the nested relations for easier UI rendering
        const formattedLogs = logs.map(log => ({
            id: log.id,
            aksi: log.aksi,
            targetId: log.targetId,
            deskripsi: log.deskripsi,
            alasan: log.alasan,
            createdAt: log.createdAt,
            userEmail: log.user ? log.user.email : 'Sistem/Unknown',
            userRole: log.user ? log.user.role : '-',
            satker: log.user && log.user.satker ? log.user.satker.nama : 'Polda Jabar'
        }));

        res.json({
            data: formattedLogs,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error("Gagal mengambil Audit Log:", error);
        res.status(500).json({ message: 'Terjadi kesalahan sistem.' });
    }
};

module.exports = {
    getAllAuditLogs
};
