const path = require('path');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files for uploads - DISABLED for Supabase
// app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

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
        // Test database connection
        await prisma.$queryRaw`SELECT 1`;
        res.json({ 
            database: 'CONNECTED', 
            environment: process.env.NODE_ENV,
            supabase_url: process.env.SUPABASE_URL ? 'CONFIGURED' : 'MISSING'
        });
    } catch (error) {
        res.status(500).json({ 
            database: 'ERROR', 
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
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
