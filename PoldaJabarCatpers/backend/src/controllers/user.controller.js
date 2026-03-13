const prisma = require('../prisma');
const bcrypt = require('bcryptjs');

const getAllUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            include: { satker: true },
            orderBy: { createdAt: 'desc' }
        });
        // Sembunyikan field password
        const safeUsers = users.map(u => {
            const { password, ...rest } = u;
            return rest;
        });
        res.json(safeUsers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan server saat mengambil data User.' });
    }
};

const createUser = async (req, res) => {
    try {
        const { email, password, role, satkerId } = req.body;

        const exist = await prisma.user.findUnique({ where: { email } });
        if (exist) return res.status(400).json({ message: 'Email sudah terdaftar.' });

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                role: role || 'OPERATOR_SATKER',
                satkerId: satkerId ? parseInt(satkerId) : null
            }
        });

        await prisma.auditLog.create({
            data: {
                userId: req.user.id,
                aksi: 'CREATE_USER',
                targetId: String(user.id),
                deskripsi: `Menambahkan akun baru: "${email}" (${role || 'OPERATOR_SATKER'})`,
                alasan: 'Tambah User oleh Admin'
            }
        });

        res.status(201).json({ message: 'User berhasil dibuat.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan server saat membuat User.' });
    }
};

const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { email, password, role, satkerId } = req.body;

        const dataToUpdate = {
            email,
            role,
            satkerId: satkerId ? parseInt(satkerId) : null
        };

        if (password && password.trim() !== '') {
            dataToUpdate.password = await bcrypt.hash(password, 10);
        }

        await prisma.user.update({
            where: { id: parseInt(id) },
            data: dataToUpdate
        });

        await prisma.auditLog.create({
            data: {
                userId: req.user.id,
                aksi: 'UPDATE_USER',
                targetId: String(id),
                deskripsi: `Mengubah akun user: "${email}" menjadi role: "${role}"`,
                alasan: 'Update User oleh Admin'
            }
        });

        res.json({ message: 'User berhasil diupdate.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan server saat update User.' });
    }
};

const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.user.delete({ where: { id: parseInt(id) } });

        await prisma.auditLog.create({
            data: {
                userId: req.user.id,
                aksi: 'DELETE_USER',
                targetId: String(id),
                deskripsi: `Menghapus akun user ID: ${id}`,
                alasan: 'Hapus User oleh Admin'
            }
        });

        res.json({ message: 'User berhasil dihapus.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan server saat menghapus User.' });
    }
};

const changeSelfPassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).json({ message: 'User tidak ditemukan.' });

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Password lama tidak sesuai.' });

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword }
        });

        await prisma.auditLog.create({
            data: {
                userId: userId,
                aksi: 'CHANGE_PASSWORD_SELF',
                targetId: String(userId),
                deskripsi: `User "${user.email}" mengubah password sendiri.`,
                alasan: 'Perubahan Password Mandiri'
            }
        });

        res.json({ message: 'Password berhasil diperbarui.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan server saat mengubah password.' });
    }
};

module.exports = { getAllUsers, createUser, updateUser, deleteUser, changeSelfPassword };
