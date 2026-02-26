const prisma = require('../prisma');

const getAllPengaturan = async (req, res) => {
    try {
        const settings = await prisma.pengaturan.findMany();
        res.json(settings);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan saat memuat Pengaturan.' });
    }
};

const updatePengaturan = async (req, res) => {
    try {
        let { key } = req.params;
        let { value, deskripsi } = req.body;

        const setting = await prisma.pengaturan.upsert({
            where: { key },
            update: { value, deskripsi },
            create: { key, value, deskripsi }
        });

        res.json({ message: 'Pengaturan berhasil disimpan.', data: setting });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan saat menyimpan pengaturan.' });
    }
};

const getPengaturanByKey = async (req, res) => {
    try {
        const { key } = req.params;
        const setting = await prisma.pengaturan.findUnique({ where: { key } });
        if (!setting) return res.status(404).json({ message: 'Atribut pengaturan tidak ditemukan.' });
        res.json(setting);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
};

module.exports = { getAllPengaturan, updatePengaturan, getPengaturanByKey };
