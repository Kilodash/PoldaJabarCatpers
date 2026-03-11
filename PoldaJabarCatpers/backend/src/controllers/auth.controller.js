const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../prisma');

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                satker: true
            }
        });

        if (!user) {
            return res.status(401).json({ message: 'Email atau password salah.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Email atau password salah.' });
        }

        const token = jwt.sign(
            {
                id: user.id,
                role: user.role,
                satkerId: user.satkerId
            },
            process.env.JWT_SECRET || 'rahasia_catpers',
            { expiresIn: '1d' }
        );

        res.json({
            message: 'Login berhasil',
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                satker: user.satker
            }
        });

    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ 
            message: 'Terjadi kesalahan pada server.',
            error: error.message,
            hint: 'Pastikan DATABASE_URL dan JWT_SECRET sudah diatur di Vercel.'
        });
    }
};

const getMe = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: { satker: true }
        });

        if (!user) return res.status(404).json({ message: 'User tidak ditemukan' });

        res.json({
            id: user.id,
            email: user.email,
            role: user.role,
            satker: user.satker
        });
    } catch (error) {
        res.status(500).json({ message: 'Terjadi kesalahan server' });
    }
}

module.exports = {
    login,
    getMe
};
