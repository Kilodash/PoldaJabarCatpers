const { supabase } = require('../utils/supabase');
const prisma = require('../prisma');

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Authenticate with Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            console.log(`[LOGIN_DIAGNOSTIC] Auth error for ${email}: ${error.message}`);
            return res.status(401).json({ message: 'Email atau password salah.' });
        }

        const { session, user: supabaseUser } = data;
        const normalizedEmail = email.trim().toLowerCase();

        // 2. Fetch local user profile case-insensitively
        const localUser = await prisma.user.findFirst({
            where: {
                email: {
                    equals: normalizedEmail,
                    mode: 'insensitive'
                }
            },
            include: {
                satker: true
            }
        });

        if (!localUser) {
            console.log(`[LOGIN_DIAGNOSTIC] local user not found for: ${normalizedEmail}`);
            return res.status(403).json({ message: 'User Supabase ditemukan, tetapi profil lokal tidak ada.' });
        }

        console.log(`[LOGIN_DIAGNOSTIC] Login success for: ${email}`);

        res.json({
            message: 'Login berhasil',
            token: session.access_token,
            user: {
                id: localUser.id,
                email: localUser.email,
                role: localUser.role,
                satker: localUser.satker
            }
        });

    } catch (error) {
        console.error('--- [LOGIN_DIAGNOSTIC] CRITICAL ERROR ---');
        console.error('Message:', error.message);
        res.status(500).json({
            message: 'Terjadi kesalahan pada server saat login.',
            detail: error.message
        });
    }
};

const getMe = async (req, res) => {
    try {
        // req.user is already populated by authMiddleware
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
        console.error('GetMe Error:', error);
        res.status(500).json({ message: 'Terjadi kesalahan server' });
    }
}

module.exports = {
    login,
    getMe
};
