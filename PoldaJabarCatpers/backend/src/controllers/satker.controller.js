const prisma = require('../prisma');

// Admin only: Buat Satker Baru
const createSatker = async (req, res) => {
    try {
        const { nama, urutan } = req.body;

        if (!nama) {
            return res.status(400).json({ message: 'Nama Satker wajib diisi.' });
        }

        const exisingSatker = await prisma.satker.findUnique({ where: { nama } });
        if (exisingSatker) {
            return res.status(400).json({ message: 'Satker sudah ada.' });
        }

        const satker = await prisma.satker.create({
            data: {
                nama,
                urutan: urutan ? parseInt(urutan) : 0
            }
        });

        await prisma.auditLog.create({
            data: {
                userId: req.user.id,
                aksi: 'CREATE_SATKER',
                targetId: String(satker.id),
                deskripsi: `Menambahkan Satuan Kerja baru: "${nama}"`,
                alasan: 'Tambah Satker oleh Admin'
            }
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
        const satkerList = await prisma.satker.findMany({
            orderBy: { nama: 'asc' }
        });

        // Custom sort hierarchy following specific order from user image
        const priority = (nama) => {
            const n = nama.toLowerCase();

            // 0. Polda Jabar (Absolute top if it exists standalone)
            if (nama === 'Polda Jabar') return 0;

            // Mapping based on provided image order:
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
            if (n.startsWith('ditressiber')) return 17; // Additional new unit
            if (n.startsWith('ditres ppa')) return 18; // Additional new unit

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

            // Regionals
            if (n.startsWith('polrestabes')) return 31;
            if (n.startsWith('polresta ')) return 32;
            if (n.startsWith('polres')) return 33;

            return 40;
        };

        satkerList.sort((a, b) => {
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

        // Data satker jarang berubah — cache 60 detik di Vercel Edge
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
        res.json(satkerList);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
};

const updateSatker = async (req, res) => {
    try {
        const { id } = req.params;
        const { nama, urutan } = req.body;

        const updateData = {};
        if (nama !== undefined) updateData.nama = nama;
        if (urutan !== undefined) updateData.urutan = parseInt(urutan);

        const satker = await prisma.satker.update({
            where: { id: parseInt(id) },
            data: updateData
        });

        await prisma.auditLog.create({
            data: {
                userId: req.user.id,
                aksi: 'UPDATE_SATKER',
                targetId: String(id),
                deskripsi: `Mengubah nama Satuan Kerja menjadi: "${nama}"`,
                alasan: 'Edit Satker oleh Admin'
            }
        });

        res.json({ message: 'Satker berhasil diupdate', data: satker });
    } catch (error) {
        console.error('Update Satker Error:', error);
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

        await prisma.auditLog.create({
            data: {
                userId: req.user.id,
                aksi: 'DELETE_SATKER',
                targetId: String(id),
                deskripsi: `Menghapus Satuan Kerja ID: ${id}`,
                alasan: 'Hapus Satker oleh Admin'
            }
        });

        res.json({ message: 'Satker berhasil dihapus' });
    } catch (error) {
        res.status(500).json({ message: 'Gagal menghapus Satker' });
    }
}

const reorderSatker = async (req, res) => {
    try {
        const { items } = req.body; // array of { id, urutan }

        if (!Array.isArray(items)) {
            return res.status(400).json({ message: 'Data urutan tidak valid.' });
        }

        // Use transaction for performance and consistency
        await prisma.$transaction(
            items.map(item =>
                prisma.satker.update({
                    where: { id: parseInt(item.id) },
                    data: { urutan: parseInt(item.urutan) }
                })
            )
        );

        res.json({ message: 'Urutan Satker berhasil diperbarui.' });
    } catch (error) {
        console.error("Gagal mereorder Satker:", error);
        res.status(500).json({ message: 'Gagal memperbarui urutan Satker.', error: error.message });
    }
}

module.exports = {
    createSatker,
    getAllSatker,
    updateSatker,
    deleteSatker,
    reorderSatker
};
