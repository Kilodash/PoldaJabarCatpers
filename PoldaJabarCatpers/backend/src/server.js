const path = require('path');
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// ----- CORS: Batasi ke domain frontend -----
const allowedOrigins = (process.env.ALLOWED_ORIGIN || '').split(',').map(o => o.trim()).filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Izinkan jika tidak ada origin (REST clients, server-to-server) atau ada di whitelist
        if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`CORS: Origin '${origin}' tidak diizinkan.`));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ----- Rate Limiting: Proteksi endpoint login -----
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 menit
    max: 15, // Maksimal 15 percobaan login per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Terlalu banyak percobaan login. Silakan coba lagi dalam 15 menit.' }
});

// Health Check
app.get('/', (req, res) => {
    res.json({ 
        message: 'CDS Polda Jabar API is running', 
        status: 'OK',
        time: new Date().toISOString()
    });
});

// Database & Connectivity Test
const prisma = require('./prisma');
app.get('/api/health-check', async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({ 
            database: 'CONNECTED', 
            environment: process.env.NODE_ENV,
            supabase_url: process.env.SUPABASE_URL ? 'CONFIGURED' : 'MISSING',
            server_time: new Date().toISOString()
        });
    } catch (error) {
        console.error('Health Check Error:', error.message);
        res.status(500).json({ 
            database: 'ERROR', 
            message: 'Database connection failed.',
            hint: 'Check Vercel Environment Variables and Supabase IP allowlist.'
        });
    }
});

// Routes
const authRoutes = require('./routes/auth.routes');
const satkerRoutes = require('./routes/satker.routes');
const personelRoutes = require('./routes/personel.routes');
const pelanggaranRoutes = require('./routes/pelanggaran.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const userRoutes = require('./routes/user.routes');
const pengaturanRoutes = require('./routes/pengaturan.routes');
const auditRoutes = require('./routes/audit.routes');
const pencarianRoutes = require('./routes/pencarian.routes');

// Terapkan rate limit hanya ke login
app.use('/api/auth/login', loginLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/satker', satkerRoutes);
app.use('/api/personel', personelRoutes);
app.use('/api/pelanggaran', pelanggaranRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/pengaturan', pengaturanRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/pencarian', pencarianRoutes);

if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`Server berjalan di port ${PORT} (Local Mode)`);
    });
}

// Export the app for Vercel Serverless Function
module.exports = app;
