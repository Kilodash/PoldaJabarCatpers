const express = require('express');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

require('dotenv').config();

// Diagnostic helper
const checkEnv = (name) => {
    const val = process.env[name];
    if (!val) return 'MISSING';
    return `EXISTS (Len: ${val.length})`;
};

console.log('--- RUNTIME STARTUP (v1.1.9-DEBUG) ---');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_URL:', checkEnv('DATABASE_URL'));
console.log('JWT_SECRET:', checkEnv('JWT_SECRET'));
console.log('ALLOWED_ORIGIN:', checkEnv('ALLOWED_ORIGIN'));
console.log('DIRECT_URL:', checkEnv('DIRECT_URL'));
console.log('TIMESTAMP:', new Date().toISOString());
console.log('--------------------------------------');

const app = express();

try {
    app.set('trust proxy', 1);

    const allowedOrigins = (process.env.ALLOWED_ORIGIN || '').split(',').map(o => o.trim()).filter(Boolean);
    app.use(cors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                console.warn(`CORS blocked: origin '${origin}'`);
                callback(new Error(`CORS Error: '${origin}' not allowed.`));
            }
        },
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true
    }));

    app.use(compression());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Root endpoint for verification
    app.get('/', (req, res) => {
        res.json({ message: 'Polda Jabar API' });
    });

    // Debug endpoint — test DB connection directly
    app.get('/api/debug/ping', async (req, res) => {
        const prisma = require('./prisma');
        try {
            const start = Date.now();
            await prisma.$queryRaw`SELECT 1`;
            const dbLatency = Date.now() - start;
            
            res.json({ 
                db: 'OK', 
                latency: `${dbLatency}ms`,
                time: new Date().toISOString(),
                uptime: `${Math.floor(process.uptime())}s`,
                memory: {
                    used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
                    total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`
                }
            });
        } catch (err) {
            res.status(500).json({
                db: 'FAILED',
                error: err.message,
                code: err.code,
                name: err.constructor.name,
                time: new Date().toISOString()
            });
        }
    });

    // Routes
    console.log('Mounting routes...');
    app.use('/api/auth', require('./routes/auth.routes'));
    app.use('/api/satker', require('./routes/satker.routes'));
    app.use('/api/personel', require('./routes/personel.routes'));
    app.use('/api/pelanggaran', require('./routes/pelanggaran.routes'));
    app.use('/api/dashboard', require('./routes/dashboard.routes'));
    app.use('/api/users', require('./routes/user.routes'));
    app.use('/api/pengaturan', require('./routes/pengaturan.routes'));
    app.use('/api/audit', require('./routes/audit.routes'));
    app.use('/api/pencarian', require('./routes/pencarian.routes'));
    app.use('/api/storage', require('./routes/storage.routes'));
    console.log('Routes mounted.');

    // 404 Handler
    app.use((req, res) => {
        res.status(404).json({ message: `Route ${req.originalUrl} tidak ditemukan.` });
    });

    // Global Error Handler
    app.use((err, req, res, next) => {
        console.error('--- [SERVER_ERROR] ---');
        console.error('Time:', new Date().toISOString());
        console.error('Path:', req.path);
        console.error('Message:', err.message);
        if (err.stack) console.error('Stack:', err.stack);
        console.error('----------------------');

        // Handle Multer Errors (e.g. File too large)
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                message: 'Ukuran file terlalu besar! Maksimal diperbolehkan 5MB.'
            });
        }
        
        if (err.name === 'MulterError') {
            return res.status(400).json({
                message: `Kesalahan Unggah: ${err.message}`
            });
        }

        res.status(err.status || 500).json({
            message: 'Terjadi kesalahan pada server.',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    });

} catch (err) {
    console.error('FATAL BOOT ERROR:', err);
}

if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Local server on ${PORT}`));
}

module.exports = app;
