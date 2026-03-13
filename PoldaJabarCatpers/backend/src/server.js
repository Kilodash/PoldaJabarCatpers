const path = require('path');
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Diagnostic helper
const checkEnv = (name) => {
    const val = process.env[name];
    if (!val) return 'MISSING';
    return `EXISTS (Len: ${val.length})`;
};

console.log('--- RUNTIME STARTUP (v1.1.7-FIX) ---');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_URL:', checkEnv('DATABASE_URL'));
console.log('JWT_SECRET:', checkEnv('JWT_SECRET'));
console.log('ALLOWED_ORIGIN:', checkEnv('ALLOWED_ORIGIN'));
console.log('TIMESTAMP:', new Date().toISOString());
console.log('-------------------------------------');

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

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Root endpoint for verification
    app.get('/', (req, res) => {
        res.json({ 
            message: 'Polda Jabar API Diagnostics', 
            status: 'READY',
            version: 'v1.1.6-CLEAN-BOOT',
            node: process.version,
            time: new Date().toISOString()
        });
    });

    // Lazy load routes to prevent startup crash
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
    console.log('Routes mounted.');

} catch (err) {
    console.error('FATAL BOOT ERROR:', err);
}

if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Local server on ${PORT}`));
}

module.exports = app;
