const prisma = require('../prisma');

const getAllAuditLogs = async (req, res) => {
    try {
        const logs = await prisma.auditLog.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: { email: true, role: true, satkerId: true, satker: { select: { nama: true } } }
                }
            }
        });

        // Transform the nested relations for easier UI rendering
        const formattedLogs = logs.map(log => ({
            id: log.id,
            aksi: log.aksi,
            targetId: log.targetId,
            deskripsi: log.deskripsi,
            alasan: log.alasan,
            createdAt: log.createdAt,
            userEmail: log.user.email,
            userRole: log.user.role,
            satker: log.user.satker ? log.user.satker.nama : 'Polda Jabar'
        }));

        res.json(formattedLogs);
    } catch (error) {
        console.error("Gagal mengambil Audit Log:", error);
        res.status(500).json({ message: 'Terjadi kesalahan sistem.' });
    }
};

module.exports = {
    getAllAuditLogs
};
