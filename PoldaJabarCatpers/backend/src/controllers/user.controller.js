const prisma = require('../prisma');
const bcrypt = require('bcrypt');

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
        res.json({ message: 'User berhasil dihapus.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan server saat menghapus User.' });
    }
};

module.exports = { getAllUsers, createUser, updateUser, deleteUser };
