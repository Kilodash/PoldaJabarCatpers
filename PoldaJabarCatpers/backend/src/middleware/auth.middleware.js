const jwt = require('jsonwebtoken');

// Fallback agar app tidak crash jika JWT_SECRET belum diset di Vercel
// HARAP set JWT_SECRET di Vercel Dashboard -> Settings -> Environment Variables
const FALLBACK_SECRET = 'FALLBACK_GANTI_SEGERA_DI_VERCEL_ENV';

if (!process.env.JWT_SECRET) {
    console.error('[CRITICAL] JWT_SECRET is NOT set! Login masih bekerja dengan fallback tapi TIDAK AMAN untuk produksi.');
    console.error('[ACTION NEEDED] Set JWT_SECRET di Vercel Dashboard -> Settings -> Environment Variables');
}

const authMiddleware = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Akses ditolak. Token tidak ditemukan.' });
        }

        const secret = process.env.JWT_SECRET || FALLBACK_SECRET;
        const decoded = jwt.verify(token, secret);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Token tidak valid atau sudah kadaluarsa.' });
    }
};

module.exports = authMiddleware;
