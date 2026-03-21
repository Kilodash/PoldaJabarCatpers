const jwt = require('jsonwebtoken');

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: JWT_SECRET environment variable is not configured!');
}

const supabase = require('../supabase');
const prisma = require('../prisma');

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Akses ditolak. Token tidak ditemukan.' });
        }

        const token = authHeader.split(' ')[1];
        
        // 1. Verify token with Supabase
        const { data: { user: sbUser }, error } = await supabase.auth.getUser(token);
        
        if (error || !sbUser) {
            return res.status(401).json({ message: 'Token tidak valid atau sudah kadaluarsa.' });
        }

        // 2. Fetch Prisma user profile for Role & Satker
        const profile = await prisma.user.findUnique({
            where: { email: sbUser.email },
            include: { satker: true }
        });

        if (!profile) {
            console.warn(`[AUTH_DEBUG] User found in Supabase but MISSING in Prisma: ${sbUser.email}`);
            return res.status(403).json({ message: 'Profil pengguna tidak ditemukan di sistem internal.' });
        }

        console.log(`[AUTH_DEBUG] Prisma profile attached for: ${profile.email}`);

        // 3. Attach consolidated user info to request
        req.user = {
            id: profile.id,
            sbId: sbUser.id,
            email: profile.email,
            role: profile.role,
            satkerId: profile.satkerId,
            satker: profile.satker
        };
        
        next();
    } catch (error) {
        console.error('Auth Middleware Critical Error:', error);
        return res.status(500).json({ message: 'Terjadi kesalahan pada server saat verifikasi token.' });
    }
};

module.exports = authMiddleware;
