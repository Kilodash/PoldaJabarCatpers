const prisma = require('../prisma');
const bcrypt = require('bcryptjs');
const { supabaseAdmin } = require('../utils/supabase');

let sbUsersCache = {
    data: null,
    lastFetched: 0
};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const getAllUsers = async (req, res) => {
    try {
        const skipAuthStatus = req.query.skipAuthStatus === 'true';

        const localUsers = await prisma.user.findMany({
            include: { satker: true },
            orderBy: { createdAt: 'desc' }
        });

        let enrichedUsers = localUsers.map(u => {
            const { password, ...rest } = u;
            return { ...rest, supabaseData: null };
        });

        // Enrich with Supabase data if available and not skipped
        if (supabaseAdmin && !skipAuthStatus) {
            let sbUsers = null;
            const now = Date.now();

            // Try cache first
            if (sbUsersCache.data && (now - sbUsersCache.lastFetched < CACHE_TTL)) {
                sbUsers = sbUsersCache.data;
            } else {
                const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
                if (!listError && users) {
                    sbUsers = users;
                    sbUsersCache = { data: users, lastFetched: now };
                }
            }

            if (sbUsers) {
                enrichedUsers = enrichedUsers.map(u => {
                    const sbMatch = sbUsers.find(sb => sb.email === u.email);
                    if (sbMatch) {
                        return {
                            ...u,
                            displayName: u.displayName || sbMatch.user_metadata?.displayName || sbMatch.user_metadata?.full_name,
                            phone: u.phone || sbMatch.user_metadata?.phone,
                            supabaseData: {
                                id: sbMatch.id,
                                lastSignIn: sbMatch.last_sign_in_at,
                                confirmedAt: sbMatch.email_confirmed_at,
                                bannedUntil: sbMatch.banned_until,
                                isBanned: !!sbMatch.banned_until && new Date(sbMatch.banned_until) > new Date()
                            }
                        };
                    }
                    return u;
                });
            }
        } else if (!supabaseAdmin && !skipAuthStatus) {
            console.warn('[SYNC_WARNING] Supabase Admin not configured. User status display will be limited.');
        }

        res.json(enrichedUsers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan server saat mengambil data User.' });
    }
};

const createUser = async (req, res) => {
    try {
        const { email, password, role, satkerId, displayName, phone } = req.body;

        const exist = await prisma.user.findUnique({ where: { email } });
        if (exist) return res.status(400).json({ message: 'Email sudah terdaftar di database lokal.' });

        if (!supabaseAdmin) {
            return res.status(500).json({ message: 'Layanan Supabase Admin tidak terkonfigurasi.' });
        }

        // 1. Create user in Supabase Auth
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { displayName, phone }
        });

        if (authError) {
            console.error('Supabase Auth Error:', authError);
            return res.status(400).json({ message: 'Gagal membuat user di Supabase Auth.', detail: authError.message });
        }

        // 2. Create user in local Prisma DB
        // We still hash the password locally for legacy support or fallback, 
        // though Supabase is the primary authority now.
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                displayName,
                phone,
                role: role || 'OPERATOR_SATKER',
                satkerId: satkerId ? parseInt(satkerId) : null
            }
        });

        await prisma.auditLog.create({
            data: {
                userId: req.user.id,
                aksi: 'CREATE_USER',
                targetId: String(user.id),
                deskripsi: `Menambahkan akun baru: "${email}" (${role || 'OPERATOR_SATKER'})`,
                alasan: 'Tambah User oleh Admin'
            }
        });

        let warning = null;
        if (!supabaseAdmin) {
            warning = 'User dibuat secara lokal, namun SINKRONISASI KE SUPABASE DILEWATI karena Master Key belum dikonfigurasi.';
            console.warn(`[SYNC_WARNING] ${warning}`);
        }

        res.status(201).json({ 
            message: 'User berhasil dibuat secara lokal.',
            warning: warning
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan server saat membuat User.' });
    }
};

const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { email, password, role, satkerId, displayName, phone } = req.body;

        const userBefore = await prisma.user.findUnique({ where: { id: parseInt(id) } });
        if (!userBefore) return res.status(404).json({ message: 'User tidak ditemukan.' });

        const dataToUpdate = {
            email,
            role,
            displayName,
            phone,
            satkerId: satkerId ? parseInt(satkerId) : null
        };

        // Update in Supabase Auth if email or password changed
        if (supabaseAdmin) {
            const emailChanged = email !== userBefore.email;
            const passwordProvided = password && password.trim() !== '';
            const metaChanged = displayName !== userBefore.displayName || phone !== userBefore.phone;

            if (emailChanged || passwordProvided || metaChanged) {
                const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
                
                if (listError) {
                    console.error('Gagal mengambil daftar user Supabase:', listError.message);
                } else {
                    let sbUser = users.find(u => u.email === userBefore.email);

                    // UPSERT LOGIC: If user exists in local DB but NOT in Supabase Auth, CREATE them
                    if (!sbUser) {
                        console.log(`[SYNC] User ${userBefore.email} missing in Supabase. Creating...`);
                        const { data: newSbUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
                            email: email, // Use new email if it's changing
                            password: passwordProvided ? password : 'TemporaryPassword123!', // Need a password for new user
                            email_confirm: true,
                            user_metadata: { displayName, phone }
                        });

                        if (createError) {
                            console.error('Gagal sinkronisasi (Create) ke Supabase:', createError.message);
                        } else {
                            console.log(`[SYNC] User ${email} successfully created in Supabase.`);
                        }
                    } else {
                        // Regular Update
                        const updatePayload = {
                            user_metadata: { displayName, phone }
                        };
                        if (emailChanged) updatePayload.email = email;
                        if (passwordProvided) updatePayload.password = password;

                        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(sbUser.id, updatePayload);
                        if (updateError) {
                            console.error('Gagal sinkronisasi (Update) ke Supabase:', updateError.message);
                        } else {
                            console.log(`[SYNC] User ${email} successfully updated in Supabase.`);
                        }
                    }
                }
            }
        } else {
            console.warn('[SYNC_WARNING] Supabase Admin not configured. Skipping Auth sync.');
        }

        if (password && password.trim() !== '') {
            dataToUpdate.password = await bcrypt.hash(password, 10);
        }

        await prisma.user.update({
            where: { id: parseInt(id) },
            data: dataToUpdate
        });

        await prisma.auditLog.create({
            data: {
                userId: req.user.id,
                aksi: 'UPDATE_USER',
                targetId: String(id),
                deskripsi: `Mengubah akun user: "${email}" menjadi role: "${role}"`,
                alasan: 'Update User oleh Admin'
            }
        });

        let warning = null;
        console.log('[USER_CONTROLLER_DEBUG] supabaseAdmin truthy:', !!supabaseAdmin);
        if (!supabaseAdmin) {
            warning = 'Profil lokal diperbarui, namun SINKRONISASI KE SUPABASE DILEWATI karena Master Key (Service Role) belum dikonfigurasi.';
            console.warn(`[SYNC_WARNING] ${warning}`);
        }

        res.json({ 
            message: 'User berhasil diupdate.',
            warning: warning 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan server saat update User.' });
    }
};

const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const userToDelete = await prisma.user.findUnique({ where: { id: parseInt(id) } });

        if (!userToDelete) return res.status(404).json({ message: 'User tidak ditemukan.' });

        // Delete from Supabase Auth
        if (supabaseAdmin) {
            const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
            if (listError) {
                console.error('Gagal mengambil daftar user Supabase saat hapus:', listError.message);
            } else {
                const sbUser = users.find(u => u.email === userToDelete.email);
                if (sbUser) {
                    const { error: delError } = await supabaseAdmin.auth.admin.deleteUser(sbUser.id);
                    if (delError) {
                        console.error('Gagal hapus user di Supabase:', delError.message);
                    } else {
                        console.log(`[SYNC] User ${userToDelete.email} deleted from Supabase.`);
                    }
                } else {
                    console.log(`[SYNC] User ${userToDelete.email} not found in Supabase. Skipping Auth deletion.`);
                }
            }
        } else {
            console.warn('[SYNC_WARNING] Supabase Admin not configured. Skipping Auth deletion.');
        }

        await prisma.user.delete({ where: { id: parseInt(id) } });

        await prisma.auditLog.create({
            data: {
                userId: req.user.id,
                aksi: 'DELETE_USER',
                targetId: String(id),
                deskripsi: `Menghapus akun user email: ${userToDelete.email}`,
                alasan: 'Hapus User oleh Admin'
            }
        });

        res.json({ message: 'User berhasil dihapus dari Supabase dan lokal.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan server saat menghapus User.' });
    }
};

const changeSelfPassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userEmail = req.user.email;

        // Delegate to Supabase Auth (this verifies the session and updates the password)
        // Note: For 'updateUser' to work with 'password', the session must be active, 
        // which it is since they are logged in.
        const { error } = await supabaseAdmin.auth.admin.updateUserById(
            // We need the Supabase UUID here. Since we only have the email in req.user, 
            // we find the user first.
            (await supabaseAdmin.auth.admin.listUsers()).data.users.find(u => u.email === userEmail).id,
            { password: newPassword }
        );

        if (error) {
            console.error('Supabase Change Password Error:', error);
            return res.status(400).json({ message: 'Gagal memperbarui password di Supabase.', detail: error.message });
        }

        // We also update the local hash just to keep it in sync for any legacy read, 
        // though we should ideally phase this out.
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { email: userEmail },
            data: { password: hashedPassword }
        });

        await prisma.auditLog.create({
            data: {
                userId: req.user.id,
                aksi: 'CHANGE_PASSWORD_SELF',
                targetId: String(req.user.id),
                deskripsi: `User "${userEmail}" mengubah password sendiri via Supabase.`,
                alasan: 'Perubahan Password Mandiri'
            }
        });

        res.json({ message: 'Password berhasil diperbarui.' });
    } catch (error) {
        console.error('ChangeSelfPassword Error:', error);
        res.status(500).json({ message: 'Terjadi kesalahan server saat mengubah password.' });
    }
};

const adminResetPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await prisma.user.findUnique({ where: { id: parseInt(id) } });
        if (!user) return res.status(404).json({ message: 'User tidak ditemukan.' });

        if (!supabaseAdmin) return res.status(500).json({ message: 'Layanan Supabase Admin tidak terkonfigurasi.' });

        const { error } = await supabaseAdmin.auth.admin.generateLink({
            type: 'recovery',
            email: user.email
        });

        if (error) {
            console.error('Supabase Reset Password Error:', error);
            return res.status(400).json({ message: 'Gagal mengirim email reset password via Supabase.', detail: error.message });
        }

        await prisma.auditLog.create({
            data: {
                userId: req.user.id,
                aksi: 'ADMIN_RESET_PASSWORD',
                targetId: String(id),
                deskripsi: `Admin memicu reset password untuk user: ${user.email}`,
                alasan: 'Reset Password oleh Admin'
            }
        });

        res.json({ message: 'Instruksi reset password telah dikirim ke email user.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan server saat memproses reset password.' });
    }
};

const toggleUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { isBanned } = req.body; // true to ban, false to unban

        const user = await prisma.user.findUnique({ where: { id: parseInt(id) } });
        if (!user) return res.status(404).json({ message: 'User tidak ditemukan.' });

        if (!supabaseAdmin) return res.status(500).json({ message: 'Layanan Supabase Admin tidak terkonfigurasi.' });

        // Find user UUID in Supabase
        if (supabaseAdmin) {
            const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
            if (listError) {
                console.error('Gagal mengambil daftar user Supabase saat toggle status:', listError.message);
            } else {
                const sbUser = users.find(u => u.email === user.email);

                if (!sbUser) {
                    console.warn(`[SYNC] User ${user.email} not found in Supabase Auth. Cannot toggle status.`);
                } else {
                    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(sbUser.id, {
                        ban_duration: isBanned ? '876000h' : 'none' // Ban for 100 years or unban
                    });

                    if (updateError) {
                        console.error('Supabase Ban/Unban Error:', updateError);
                        // Optional: we might want to return error here as this is a specific action
                    } else {
                        console.log(`[SYNC] User ${user.email} status toggled in Supabase (Banned: ${isBanned}).`);
                    }
                }
            }
        } else {
            console.warn('[SYNC_WARNING] Supabase Admin not configured. Skipping Auth status toggle.');
        }

        await prisma.auditLog.create({
            data: {
                userId: req.user.id,
                aksi: isBanned ? 'BAN_USER' : 'UNBAN_USER',
                targetId: String(id),
                deskripsi: `Admin ${isBanned ? 'menonaktifkan' : 'mengaktifkan kembali'} akun user: ${user.email}`,
                alasan: 'Perubahan status aktif akun'
            }
        });

        res.json({ message: `User berhasil ${isBanned ? 'dinonaktifkan' : 'diaktifkan kembali'}.` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Terjadi kesalahan server saat mengubah status user.' });
    }
};

module.exports = { getAllUsers, createUser, updateUser, deleteUser, changeSelfPassword, adminResetPassword, toggleUserStatus };
