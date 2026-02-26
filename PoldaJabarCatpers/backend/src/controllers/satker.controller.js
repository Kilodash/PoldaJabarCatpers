const prisma = require('../prisma');

// Admin only: Buat Satker Baru
const createSatker = async (req, res) => {
    try {
        const { nama } = req.body;

        if (!nama) {
            return res.status(400).json({ message: 'Nama Satker wajib diisi.' });
        }

        const exisingSatker = await prisma.satker.findUnique({ where: { nama } });
        if (exisingSatker) {
            return res.status(400).json({ message: 'Satker sudah ada.' });
        }

        const satker = await prisma.satker.create({
            data: { nama }
        });

        res.status(201).json({ message: 'Satker berhasil dibuat.', data: satker });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
};

// Admin & Operator (untuk lihat list)
const getAllSatker = async (req, res) => {
    try {
        const satker = await prisma.satker.findMany({
            orderBy: { id: 'asc' }
        });
        res.json(satker);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
};

const updateSatker = async (req, res) => {
    try {
        const { id } = req.params;
        const { nama } = req.body;

        const satker = await prisma.satker.update({
            where: { id: parseInt(id) },
            data: { nama }
        });
        res.json({ message: 'Satker berhasil diupdate', data: satker });
    } catch (error) {
        res.status(500).json({ message: 'Gagal mengupdate Satker' });
    }
}

const deleteSatker = async (req, res) => {
    try {
        const { id } = req.params;

        // cek relasi 
        const relatedPersonel = await prisma.personel.count({ where: { satkerId: parseInt(id) } });
        if (relatedPersonel > 0) {
            return res.status(400).json({ message: 'Satker tidak bisa dihapus karena masih memiliki personel.' });
        }

        await prisma.satker.delete({ where: { id: parseInt(id) } });
        res.json({ message: 'Satker berhasil dihapus' });
    } catch (error) {
        res.status(500).json({ message: 'Gagal menghapus Satker' });
    }
}

module.exports = {
    createSatker,
    getAllSatker,
    updateSatker,
    deleteSatker
};
