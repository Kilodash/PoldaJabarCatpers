'use strict';

const bcrypt = require('bcryptjs');
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
            console.log(`[LOGIN_DIAGNOSTIC] User not found: ${email}`);
            return res.status(401).json({ message: 'Email atau password salah.' });
        }

        console.log(`[LOGIN_DIAGNOSTIC] User found, comparing passwords...`);
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log(`[LOGIN_DIAGNOSTIC] Password mismatch for: ${email}`);
            return res.status(401).json({ message: 'Email atau password salah.' });
        }

        const secret = process.env.JWT_SECRET;
        if (!secret) {
            console.error('[LOGIN_DIAGNOSTIC] FATAL: JWT_SECRET is not configured!');
            return res.status(500).json({ message: 'Terjadi kesalahan konfigurasi pada server (JWT_SECRET).' });
        }

        console.log(`[LOGIN_DIAGNOSTIC] Password match, signing token...`);
        const token = jwt.sign(
            {
                id: user.id,
                role: user.role,
                satkerId: user.satkerId
            },
            secret,
            { expiresIn: '1d' }
        );

        console.log(`[LOGIN_DIAGNOSTIC] Login success for: ${email}`);
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
        console.error('--- [LOGIN_DIAGNOSTIC] CRITICAL ERROR ---');
        console.error('Message:', error.message);
        console.error('Name:', error.name);
        if (error.code) console.error('Code:', error.code);
        if (error.stack) console.error('Stack:', error.stack);
        console.error('-----------------------------------------');
        
        res.status(500).json({ 
            message: 'Terjadi kesalahan pada server saat login.',
            detail: error.message
        });
    }
};

const getMe = async (req, res) => {
    try {
        // middleware already attached profile to req.user
        res.json(req.user);
    } catch (error) {
        console.error('GetMe Error:', error);
        res.status(500).json({ message: 'Terjadi kesalahan server' });
    }
}

module.exports = {
    login,
    getMe
};
