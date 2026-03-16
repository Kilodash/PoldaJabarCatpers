const { supabase } = require('../utils/supabase');
const prisma = require('../prisma');

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Akses ditolak. Token tidak ditemukan.' });
        }

        // Verify session with Supabase
        const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);

        if (error) {
            console.error(`[AUTH_DIAGNOSTIC] Supabase getUser error:`, error.message);
            return res.status(401).json({ message: 'Sesi tidak valid atau sudah kadaluarsa.', detail: error.message });
        }

        if (!supabaseUser) {
            console.error(`[AUTH_DIAGNOSTIC] No user found for token.`);
            return res.status(401).json({ message: 'Sesi tidak valid.' });
        }

        console.log(`[AUTH_DIAGNOSTIC] Token verified for:`, supabaseUser.email);
        const normalizedEmail = supabaseUser.email.trim().toLowerCase();

        // Seek user case-insensitively
        const localUser = await prisma.user.findFirst({
            where: {
                email: {
                    equals: normalizedEmail,
                    mode: 'insensitive'
                }
            },
            select: {
                id: true,
                email: true,
                role: true,
                satkerId: true
            }
        });

        if (!localUser) {
            console.error(`[AUTH_DIAGNOSTIC] local profile MISSING for email: ${normalizedEmail}`);
            return res.status(403).json({ message: 'User Supabase ditemukan, tetapi profil lokal tidak ada.' });
        }

        // Attach user info to request object
        req.user = localUser;
        next();
    } catch (error) {
        console.error('Auth Middleware Error:', error);
        return res.status(500).json({ message: 'Terjadi kesalahan sistem pada otentikasi.' });
    }
};

module.exports = authMiddleware;
