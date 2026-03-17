import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    Settings, Users, User, Building, ShieldCheck, Plus, Edit2, Trash2,
    FileText, Download, Upload, Database, GripVertical, Search,
    Mail, Lock, Unlock, CheckCircle, XCircle
} from 'lucide-react';
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SortableSatkerRow = ({ s, format, handleOpenModal, handleDelete }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: s.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        background: isDragging ? 'rgba(87, 108, 188, 0.05)' : 'white',
        zIndex: isDragging ? 100 : 1,
        position: isDragging ? 'relative' : 'static',
        boxShadow: isDragging ? '0 5px 15px rgba(0,0,0,0.1)' : 'none'
    };

    return (
        <tr ref={setNodeRef} style={style}>
            <td {...attributes} {...listeners} style={{ cursor: 'grab' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <GripVertical size={16} color="#94a3b8" />
                    <span style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>{s.urutan || '-'}</span>
                </div>
            </td>
            <td style={{ fontWeight: 600 }}>{s.nama}</td>
            <td style={{ fontSize: '0.9em', color: 'var(--text-muted)' }}>{format(new Date(s.createdAt), 'dd/MM/yyyy')}</td>
            <td>
                <div className="action-btns">
                    <button className="btn-icon" onClick={(e) => handleOpenModal('satker', s, e)} title="Edit"><Edit2 size={18} /></button>
                    <button className="btn-icon delete" onClick={() => handleDelete('satker', s.id)} title="Hapus Kesatuan"><Trash2 size={18} /></button>
                </div>
            </td>
        </tr>
    );
};

import { Toaster, toast } from 'sonner';
import { format } from 'date-fns';
import api from '../utils/api';
import Modal from '../components/Modal';
import Loading from '../components/Loading';

const Pengaturan = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState(user?.role === 'ADMIN_POLDA' ? 'users' : 'profil'); // profil | users | satker | app | impor_ekspor

    // States for data
    const [usersList, setUsersList] = useState([]);
    const [satkerList, setSatkerList] = useState([]);
    const [pengaturanList, setPengaturanList] = useState([]);
    const [auditList, setAuditList] = useState([]);
    const [auditMeta, setAuditMeta] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
    const [auditSearch, setAuditSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [reorderLoading, setReorderLoading] = useState(false);

    // Audit Pagination State
    const [auditPage, setAuditPage] = useState(1);
    const auditItemsPerPage = 10;

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const [importLoading, setImportLoading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [selectedExportSatker, setSelectedExportSatker] = useState('');
    const [retiringPersonnel, setRetiringPersonnel] = useState([]);
    const [scanLoading, setScanLoading] = useState(false);
    const [bulkUpdateLoading, setBulkUpdateLoading] = useState(false);
    const [retiringAlasan, setRetiringAlasan] = useState('');

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState(''); // 'user', 'satker', 'app'
    const [isEdit, setIsEdit] = useState(false);
    const [formData, setFormData] = useState({});
    const [modalPosition, setModalPosition] = useState(null);

    // Self Password State
    const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [passwordLoading, setPasswordLoading] = useState(false);

    // Fetch master data
    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await Promise.allSettled([
                api.get('/users'),
                api.get('/satker'),
                api.get('/pengaturan')
            ]);

            // Check results individually
            if (res[0].status === 'fulfilled') setUsersList(res[0].value.data);
            else {
                const errMsg = res[0].reason?.response?.data?.message || 'Gagal memuat daftar User.';
                toast.error(`Error Users: ${errMsg}`);
            }

            if (res[1].status === 'fulfilled') setSatkerList(res[1].value.data);
            else {
                const errMsg = res[1].reason?.response?.data?.message || 'Gagal memuat daftar Satker.';
                toast.error(`Error Satker: ${errMsg}`);
            }

            if (res[2].status === 'fulfilled') setPengaturanList(res[2].value.data);
            else {
                const errMsg = res[2].reason?.response?.data?.message || 'Gagal memuat Variabel Sistem.';
                toast.error(`Error Variabel: ${errMsg}`);
            }

        } catch (error) {
            console.error('Pengaturan Fetch Critical Error:', error);
            toast.error('Gagal memproses data pengaturan secara keseluruhan.');
        } finally {
            setLoading(false);
        }
    };

    const handleDragEnd = async (event) => {
        const { active, over } = event;

        if (active.id !== over.id) {
            const oldIndex = satkerList.findIndex((item) => item.id === active.id);
            const newIndex = satkerList.findIndex((item) => item.id === over.id);

            const newList = arrayMove(satkerList, oldIndex, newIndex);

            // Re-calculate 'urutan' based on new position
            const updatedItems = newList.map((item, idx) => ({
                id: item.id,
                urutan: idx + 1
            }));

            // Optimistic update
            setSatkerList(newList.map((item, idx) => ({ ...item, urutan: idx + 1 })));

            try {
                setReorderLoading(true);
                await api.put('/satker/reorder', { items: updatedItems });
                toast.success('Urutan Satker berhasil diperbarui.');
            } catch (error) {
                console.error(error);
                toast.error('Gagal menyimpan urutan baru.');
                fetchData(); // Rollback if failed
            } finally {
                setReorderLoading(false);
            }
        }
    };


    useEffect(() => {
        if (user?.role === 'ADMIN_POLDA') {
            fetchData();
        }
    }, [user]);

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            return toast.error('Konfirmasi password baru tidak cocok.');
        }

        try {
            setPasswordLoading(true);
            await api.put('/users/change-password', {
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            });
            toast.success('Password berhasil diperbarui.');
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error) {
            toast.error(error.response?.data?.message || 'Gagal memperbarui password.');
        } finally {
            setPasswordLoading(false);
        }
    };

    const fetchAudit = async () => {
        try {
            const res = await api.get(`/audit?page=${auditPage}&limit=${auditItemsPerPage}&search=${auditSearch}`);
            setAuditList(res.data.data);
            setAuditMeta(res.data.meta);
        } catch (error) {
            console.error('Audit Fetch Error:', error);
            toast.error('Gagal memuat data audit log.');
        }
    };

    useEffect(() => {
        if (user?.role === 'ADMIN_POLDA' && activeTab === 'audit') {
            fetchAudit();
        }
    }, [auditPage, auditSearch, activeTab, user]);

    useEffect(() => {
        setAuditPage(1);
    }, [auditSearch, activeTab]);

    const handleAdminResetPassword = async (userId) => {
        if (!window.confirm('Kirim email instruksi reset password ke user ini?')) return;
        try {
            await api.post(`/users/${userId}/reset-password`);
            toast.success('Email reset password berhasil dikirim.');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Gagal mengirim email reset password');
        }
    };

    const handleToggleUserStatus = async (userId, isBanned) => {
        const action = isBanned ? 'menonaktifkan' : 'mengaktifkan kembali';
        if (!window.confirm(`Yakin ingin ${action} akun user ini?`)) return;
        try {
            await api.post(`/users/${userId}/toggle-status`, { isBanned });
            toast.success(`User berhasil ${isBanned ? 'dinonaktifkan' : 'diaktifkan'}.`);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Gagal mengubah status user');
        }
    };

    if (!user) {
        return <div className="p-8 text-center text-[var(--danger)] font-semibold mt-10">AKSES DITOLAK. Silahkan login terlebih dahulu.</div>;
    }

    const handleDownloadAudit = async () => {
        try {
            toast.info('Menyiapkan file unduhan...');
            const res = await api.get(`/audit?page=1&limit=5000&search=${auditSearch}`);
            const allLogs = res.data.data;
            if (allLogs.length === 0) { toast.error('Tidak ada data log untuk diunduh.'); return; }

            const header = ['Waktu Eksekusi', 'Operator / Aktor', 'Satker', 'Tipe Aksi', 'Rincian Deskripsi', 'Alasan'];
            const rows = allLogs.map(log => [
                new Date(log.createdAt).toLocaleString('id-ID'),
                log.userEmail,
                log.satker || '-',
                log.aksi,
                `"${(log.deskripsi || '').replace(/"/g, '""')}"`,
                `"${(log.alasan || '').replace(/"/g, '""')}"`
            ]);
            const csvContent = [header, ...rows].map(r => r.join(';')).join('\n');
            const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
            link.click();
            URL.revokeObjectURL(url);
            toast.success('Audit log berhasil diunduh.');
        } catch (error) {
            toast.error('Gagal mengunduh audit log.');
        }
    };

    // Handlers
    const handleOpenModal = (type, data = null, event = null) => {
        setModalType(type);
        setIsEdit(!!data);

        if (event) {
            setModalPosition({ x: event.clientX, y: event.clientY });
        } else {
            setModalPosition(null);
        }

        switch (type) {
            case 'user':
                setFormData(data ? { ...data, password: '' } : { id: '', email: '', password: '', role: 'OPERATOR_SATKER', satkerId: '', displayName: '', phone: '' });
                break;
            case 'satker':
                setFormData(data || { id: '', nama: '', urutan: 0 });
                break;
            case 'app':
                setFormData(data || { key: '', value: '', deskripsi: '' });
                break;
            default: break;
        }
        setIsModalOpen(true);
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (modalType === 'user') {
                const payload = { ...formData, satkerId: formData.satkerId ? parseInt(formData.satkerId) : null };
                if (isEdit) {
                    const res = await api.put(`/users/${formData.id}`, payload);
                    toast.success(res.data.message || 'User berhasil diupdate');
                    if (res.data.warning) toast.warning(res.data.warning, { duration: 6000 });
                } else {
                    const res = await api.post('/users', payload);
                    toast.success(res.data.message || 'User berhasil ditambahkan');
                    if (res.data.warning) toast.warning(res.data.warning, { duration: 6000 });
                }
            } else if (modalType === 'satker') {
                const payload = {
                    nama: formData.nama,
                    urutan: formData.urutan ? parseInt(formData.urutan) : 0
                };
                if (isEdit) {
                    await api.put(`/satker/${formData.id}`, payload);
                    toast.success('Satker berhasil diupdate');
                } else {
                    await api.post('/satker', payload);
                    toast.success('Satker berhasil ditambahkan');
                }
            } else if (modalType === 'app') {
                await api.put(`/pengaturan/${formData.key}`, { value: formData.value, deskripsi: formData.deskripsi });
                toast.success('Pengaturan berhasil disimpan');
            }

            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || `Gagal menyimpan data ${modalType}`);
        }
    };

    const handleDelete = async (type, id) => {
        if (window.confirm(`Yakin ingin menghapus ${type} ini? Tindakan ini tidak dapat dibatalkan.`)) {
            try {
                if (type === 'user') await api.delete(`/users/${id}`);
                else if (type === 'satker') await api.delete(`/satker/${id}`);

                toast.success(`${type} berhasil dihapus`);
                fetchData();
            } catch (error) {
                toast.error(error.response?.data?.message || 'Gagal menghapus data');
            }
        }
    };

    const handleExport = async (e, satkerId = null) => {
        try {
            const params = satkerId ? { satkerId } : {};
            const response = await api.get('/pengaturan/export', {
                params,
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;

            const timestamp = format(new Date(), 'yyyyMMdd_HHmm');
            const filename = satkerId
                ? `export_catpers_satker_${satkerId}_${timestamp}.xlsx`
                : `export_catpers_full_${timestamp}.xlsx`;

            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            toast.success(satkerId ? 'Data Satker berhasil diekspor' : 'Satu database berhasil diekspor');
        } catch (error) {
            toast.error('Gagal mengekspor data.');
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            const response = await api.get('/pengaturan/template', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'template_import_catpers.xlsx');
            document.body.appendChild(link);
            link.click();
            toast.success('Template berhasil diunduh');
        } catch (error) {
            toast.error('Gagal mengunduh template.');
        }
    };

    const handleImport = async (e) => {
        // ... previous code ...
    };

    const handleScanPensiun = async () => {
        try {
            setScanLoading(true);
            const res = await api.get('/pengaturan/scan-pensiun');
            setRetiringPersonnel(res.data);
            if (res.data.length === 0) {
                toast.info('Tidak ditemukan anggota yang mencapai usia pensiun saat ini.');
            } else {
                toast.success(`Ditemukan ${res.data.length} anggota yang memasuki masa pensiun.`);
            }
        } catch (error) {
            toast.error('Gagal memindai data pensiun.');
        } finally {
            setScanLoading(false);
        }
    };

    const handleBulkUpdatePensiun = async () => {
        if (retiringPersonnel.length === 0) return;
        if (!window.confirm(`PERHATIAN: Anda akan menonaktifkan ${retiringPersonnel.length} anggota yang telah memasuki masa pensiun. \n\nSemua data ini akan dipindahkan ke kategori PENSIUN dan status keaktifan mereka akan diubah. \n\nLanjutkan proses nonaktifkan masal?`)) return;

        try {
            setBulkUpdateLoading(true);
            const ids = retiringPersonnel.map(p => p.id);
            await api.post('/pengaturan/bulk-pensiun', { ids, alasan: retiringAlasan });
            toast.success('Status anggota berhasil diperbarui ke PENSIUN.');
            setRetiringPersonnel([]);
            setRetiringAlasan('');
            fetchData();
        } catch (error) {
            toast.error('Gagal memperbarui status pensiun masal.');
        } finally {
            setBulkUpdateLoading(false);
        }
    };
    const paginatedAuditList = auditList;
    const auditTotalPages = auditMeta.totalPages;
    const totalAuditItems = auditMeta.total;

    return (
        <div className="animate-fade-in">
            <Toaster position="top-right" richColors />


            {/* Tabs */}
            <div className="tabs-container" style={{
                display: 'flex',
                gap: '0.5rem',
                background: 'rgba(255,255,255,0.4)',
                backdropFilter: 'blur(8px)',
                padding: '10px',
                borderRadius: '16px',
                marginBottom: '2rem',
                overflowX: 'auto',
                border: '1px solid var(--border-color)',
                boxShadow: 'var(--shadow-premium)'
            }}>
                {[
                    { id: 'profil', label: 'Profil & Keamanan', icon: <User size={18} /> },
                    { id: 'users', label: 'User', icon: <Users size={18} />, adminOnly: true },
                    { id: 'satker', label: 'Satker', icon: <Building size={18} />, adminOnly: true },
                    { id: 'app', label: 'Variabel', icon: <Settings size={18} />, adminOnly: true },
                    { id: 'impor_ekspor', label: 'Database', icon: <Database size={18} />, adminOnly: true },
                    { id: 'audit', label: 'Audit Log', icon: <FileText size={18} />, adminOnly: true }
                ].filter(tab => !tab.adminOnly || user?.role === 'ADMIN_POLDA').map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={activeTab === tab.id ? "glass-panel" : ""}
                        style={{
                            padding: '0.75rem 1.25rem',
                            fontWeight: 600,
                            borderRadius: '12px',
                            color: activeTab === tab.id ? 'var(--primary-color)' : 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            background: activeTab === tab.id ? 'white' : 'transparent',
                            boxShadow: activeTab === tab.id ? 'var(--shadow-md)' : 'none',
                            whiteSpace: 'nowrap',
                            border: activeTab === tab.id ? '1px solid var(--border-color)' : '1px solid transparent'
                        }}>
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {loading ? <div className="loading-state">Memuat Konfigurasi...</div> : (
                <div className="tab-content">
                    {/* TAB: PROFIL */}
                    {activeTab === 'profil' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                            {/* Akun Info */}
                            <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', color: 'var(--primary-color)' }}>
                                    <User size={24} />
                                    <h2 style={{ margin: 0 }}>Informasi Akun</h2>
                                </div>
                                <div className="space-y-4">
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline' }}>
                                        <span style={{ fontWeight: 600, color: 'var(--text-muted)', minWidth: '150px' }}>Email / Username:</span>
                                        <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{user.email}</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline' }}>
                                        <span style={{ fontWeight: 600, color: 'var(--text-muted)', minWidth: '150px' }}>Hak Akses:</span>
                                        <span style={{
                                            fontWeight: 800,
                                            color: 'var(--primary-color)',
                                            textTransform: 'uppercase'
                                        }}>
                                            {user.role?.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline' }}>
                                        <span style={{ fontWeight: 600, color: 'var(--text-muted)', minWidth: '150px' }}>Unit Kerja / Satker:</span>
                                        <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                                            {user.satker?.nama || "Polda Jawa Barat"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Change Password Form */}
                            <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', color: 'var(--danger)' }}>
                                    <ShieldCheck size={24} />
                                    <h2 style={{ margin: 0 }}>Keamanan & Password</h2>
                                </div>
                                <form onSubmit={handlePasswordChange} className="space-y-4">
                                    <div className="form-group">
                                        <label>Password Saat Ini</label>
                                        <input
                                            type="password"
                                            className="form-input"
                                            required
                                            value={passwordData.currentPassword}
                                            onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Password Baru</label>
                                        <input
                                            type="password"
                                            className="form-input"
                                            required
                                            minLength={6}
                                            value={passwordData.newPassword}
                                            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Konfirmasi Password Baru</label>
                                        <input
                                            type="password"
                                            className="form-input"
                                            required
                                            value={passwordData.confirmPassword}
                                            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                        />
                                    </div>
                                    <div className="flex justify-start">
                                        <button
                                            type="submit"
                                            className="btn-primary"
                                            disabled={passwordLoading}
                                            style={{
                                                background: 'var(--danger)',
                                                padding: '0.75rem 2rem',
                                                width: 'fit-content'
                                            }}
                                        >
                                            {passwordLoading ? 'Memproses...' : 'Perbarui Password Akun'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* TAB: USERS */}
                    {activeTab === 'users' && (
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h2>Daftar Akun Pengguna</h2>
                                <button className="btn-primary" onClick={(e) => handleOpenModal('user', null, e)}><Plus size={18} /> Tambah User</button>
                            </div>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Email & Nama</th>
                                        <th>Role Akses</th>
                                        <th>No. HP</th>
                                        <th>Status Auth</th>
                                        <th>Terakhir Login</th>
                                        <th>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {usersList.map(u => (
                                        <tr key={u.id} style={{ opacity: u.supabaseData?.isBanned ? 0.6 : 1 }}>
                                            <td style={{ fontWeight: 500 }}>
                                                <div className="flex flex-col">
                                                    <span>{u.email}</span>
                                                    {u.displayName && <span style={{ fontSize: '0.85rem', color: 'var(--primary-color)' }}>{u.displayName}</span>}
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                        {u.satker?.nama || 'Polda Utama'}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span style={{
                                                    fontSize: '0.75rem',
                                                    padding: '2px 8px',
                                                    borderRadius: '12px',
                                                    background: u.role === 'ADMIN_POLDA' ? 'var(--accent-color)' : 'var(--border-color)',
                                                    color: u.role === 'ADMIN_POLDA' ? 'white' : 'var(--text-color)',
                                                    fontWeight: 600
                                                }}>
                                                    {u.role.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td style={{ fontSize: '0.9rem' }}>
                                                {u.phone || <span className="text-gray-400 italic">N/A</span>}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}>
                                                    {u.supabaseData?.confirmedAt ? (
                                                        <span className="text-success flex items-center gap-1"><CheckCircle size={14} /> Terverifikasi</span>
                                                    ) : (
                                                        <span className="text-warning flex items-center gap-1"><XCircle size={14} /> Belum Konfirmasi</span>
                                                    )}
                                                    {u.supabaseData?.isBanned && (
                                                        <span className="text-danger flex items-center gap-1 ml-2"><Lock size={14} /> Dinonaktifkan</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>
                                                {u.supabaseData?.lastSignIn
                                                    ? format(new Date(u.supabaseData.lastSignIn), 'dd/MM/yyyy HH:mm')
                                                    : <span className="italic text-gray-400">Belum pernah login</span>}
                                            </td>
                                            <td>
                                                <div className="action-btns">
                                                    <button className="btn-icon" onClick={(e) => handleOpenModal('user', u, e)} title="Edit Metadata"><Edit2 size={16} /></button>

                                                    {u.id !== user.id && (
                                                        <>
                                                            <button
                                                                className="btn-icon"
                                                                onClick={() => handleAdminResetPassword(u.id)}
                                                                title="Kirim Instruksi Reset Password"
                                                                style={{ color: 'var(--primary-color)' }}
                                                            >
                                                                <Mail size={16} />
                                                            </button>

                                                            {u.supabaseData?.isBanned ? (
                                                                <button
                                                                    className="btn-icon"
                                                                    onClick={() => handleToggleUserStatus(u.id, false)}
                                                                    title="Aktifkan Kembali Akun"
                                                                    style={{ color: 'var(--success-color)' }}
                                                                >
                                                                    <Unlock size={16} />
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    className="btn-icon"
                                                                    onClick={() => handleToggleUserStatus(u.id, true)}
                                                                    title="Nonaktifkan Akun (Ban)"
                                                                    style={{ color: 'var(--warning-color)' }}
                                                                >
                                                                    <Lock size={16} />
                                                                </button>
                                                            )}

                                                            <button className="btn-icon delete" onClick={() => handleDelete('user', u.id)} title="Hapus User Penuh"><Trash2 size={16} /></button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* TAB: SATKER */}
                    {activeTab === 'satker' && (
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h2>Struktur Satuan Kerja</h2>
                                <button className="btn-primary" onClick={(e) => handleOpenModal('satker', null, e)}><Plus size={18} /> Tambah Satker</button>
                            </div>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '80px' }}>URUTAN</th>
                                        <th>Nama Satker / Kesatuan</th>
                                        <th>Dibuat Pada</th>
                                        <th>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <DndContext
                                        sensors={sensors}
                                        collisionDetection={closestCenter}
                                        onDragEnd={handleDragEnd}
                                    >
                                        <SortableContext
                                            items={satkerList.map(s => s.id)}
                                            strategy={verticalListSortingStrategy}
                                        >
                                            {satkerList.map(s => (
                                                <SortableSatkerRow
                                                    key={s.id}
                                                    s={s}
                                                    format={format}
                                                    handleOpenModal={handleOpenModal}
                                                    handleDelete={handleDelete}
                                                />
                                            ))}
                                        </SortableContext>
                                    </DndContext>
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* TAB: APP SETTINGS */}
                    {activeTab === 'app' && (
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h2>Parameter Sistem (Umur Pensiun, dll)</h2>
                                <p className="text-sm text-gray-500">Nilai diatur secara global untuk validasi input form Personel.</p>
                            </div>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Nama Variabel (Sistem)</th>
                                        <th style={{ textAlign: 'center' }}>Nilai / Value</th>
                                        <th>Deskripsi Penggunaan</th>
                                        <th style={{ textAlign: 'center' }}>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pengaturanList.map(sett => (
                                        <tr key={sett.key}>
                                            <td style={{ fontWeight: 600 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-color)' }}>
                                                    <ShieldCheck size={18} />
                                                    {sett.key.replace(/_/g, ' ')}
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span style={{
                                                    fontSize: '1.25rem',
                                                    fontWeight: 800,
                                                    display: 'inline-block',
                                                    padding: '2px 12px',
                                                    background: 'var(--bg-light)',
                                                    borderRadius: '8px',
                                                    border: '1px solid var(--border-color)'
                                                }}>
                                                    {sett.value}
                                                </span>
                                            </td>
                                            <td style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                                {sett.deskripsi || 'Tidak ada deskripsi'}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <button className="btn-icon" onClick={(e) => handleOpenModal('app', sett, e)} title="Ubah Konfigurasi">
                                                    <Edit2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* TAB: IMPORT & EXPORT */}
                    {activeTab === 'impor_ekspor' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                            {/* Export & Template */}
                            <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', color: 'var(--primary-color)' }}>
                                    <Download size={24} />
                                    <h2 style={{ margin: 0 }}>Ekspor & Template</h2>
                                </div>
                                <p className="text-muted mb-6">Unduh seluruh data personel atau dapatkan template Excel untuk proses impor data masal.</p>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <button onClick={handleExport} className="btn-primary" style={{ justifyContent: 'center', padding: '1rem' }}>
                                        <FileText size={20} /> Ekspor Seluruh Data ke Excel
                                    </button>

                                    <div style={{ borderTop: '1px solid var(--border-color)', margin: '0.5rem 0', paddingTop: '1.5rem' }}>
                                        <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Ekspor Berdasarkan Satuan Kerja (Satker):</label>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <select
                                                className="form-input"
                                                value={selectedExportSatker}
                                                onChange={(e) => setSelectedExportSatker(e.target.value)}
                                                style={{ flex: 1 }}
                                            >
                                                <option value="">-- Pilih Satker --</option>
                                                {satkerList.map(s => (
                                                    <option key={s.id} value={s.id}>{s.nama}</option>
                                                ))}
                                            </select>
                                            <button
                                                onClick={(e) => handleExport(e, selectedExportSatker)}
                                                className="btn-primary"
                                                disabled={!selectedExportSatker}
                                                style={{ padding: '0 1.5rem', opacity: !selectedExportSatker ? 0.6 : 1 }}
                                            >
                                                Ekspor Satker
                                            </button>
                                        </div>
                                    </div>

                                    <button onClick={handleDownloadTemplate} className="btn-secondary" style={{ justifyContent: 'center', padding: '1rem', border: '2px dashed var(--border-color)' }}>
                                        <Download size={20} /> Unduh Template Import (.xlsx)
                                    </button>
                                </div>

                                <div style={{ marginTop: '2rem', padding: '1rem', background: '#fffbeb', borderRadius: '8px', border: '1px solid #fef3c7', fontSize: '0.85rem', color: '#92400e' }}>
                                    <strong>Perhatian:</strong> Pastikan data yang diisi dalam template sesuai dengan struktur kolom yang telah ditentukan agar sistem dapat memproses data dengan benar.
                                </div>
                            </div>

                            {/* Import */}
                            <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', color: 'var(--accent-color)' }}>
                                    <Upload size={24} />
                                    <h2 style={{ margin: 0 }}>Impor Data Masal</h2>
                                </div>
                                <p className="text-muted mb-6">Unggah file Excel yang telah diisi sesuai template untuk menambahkan data personel dan pelanggaran secara otomatis.</p>

                                <form onSubmit={handleImport} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <div style={{ border: '2px dashed var(--border-color)', borderRadius: '8px', padding: '2rem', textAlign: 'center', position: 'relative', background: selectedFile ? '#f0fdf4' : 'var(--bg-color)', transition: 'all 0.3s' }}>
                                        <input
                                            type="file"
                                            accept=".xlsx, .xls"
                                            onChange={(e) => setSelectedFile(e.target.files[0])}
                                            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%' }}
                                        />
                                        {selectedFile ? (
                                            <div style={{ color: 'var(--accent-color)', fontWeight: 600 }}>
                                                <FileText size={32} style={{ margin: '0 auto 0.5rem' }} />
                                                <div>{selectedFile.name}</div>
                                                <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>{(selectedFile.size / 1024).toFixed(2)} KB</div>
                                            </div>
                                        ) : (
                                            <div style={{ color: 'var(--text-muted)' }}>
                                                <Upload size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
                                                <div>Klik atau seret file Excel ke sini</div>
                                                <div style={{ fontSize: '0.8rem' }}>Hanya file .xlsx atau .xls</div>
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        type="submit"
                                        className="btn-primary"
                                        disabled={importLoading || !selectedFile}
                                        style={{ background: 'var(--accent-color)', justifyContent: 'center', padding: '1rem' }}
                                    >
                                        {importLoading ? 'Memproses Data...' : 'Mulai Proses Impor'}
                                    </button>
                                </form>
                            </div>

                            {/* Scan Retirees Section */}
                            <div style={{ gridColumn: 'span 2', background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-color)', marginTop: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--primary-color)' }}>
                                        <Users size={24} />
                                        <h2 style={{ margin: 0 }}>Pindai Anggota Pensiun</h2>
                                    </div>
                                    <button
                                        className="btn-primary"
                                        onClick={handleScanPensiun}
                                        disabled={scanLoading}
                                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                                    >
                                        <Search size={18} />
                                        {scanLoading ? <Loading variant="inline" text="Memindai..." /> : 'Mulai Pindai Anggota Pensiun'}
                                    </button>
                                </div>
                                <p className="text-muted mb-4">Cari data personel yang telah mencapai atau melewati Tanggal Pensiun namun statusnya masih AKTIF.</p>

                                {retiringPersonnel.length > 0 && (
                                    <div className="animate-fade-in">
                                        <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', marginBottom: '1.5rem' }}>
                                            <table className="data-table" style={{ margin: 0 }}>
                                                <thead>
                                                    <tr>
                                                        <th>NRP/NIP</th>
                                                        <th>Nama Lengkap</th>
                                                        <th>Satker</th>
                                                        <th>Tgl. Pensiun</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {retiringPersonnel.map(p => (
                                                        <tr key={p.id}>
                                                            <td style={{ fontWeight: 600 }}>{p.nrpNip}</td>
                                                            <td>{p.namaLengkap}</td>
                                                            <td>{p.satker?.nama}</td>
                                                            <td className="text-danger font-bold">{format(new Date(p.tanggalPensiun), 'dd/MM/yyyy')}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', background: '#f8fafc', padding: '1.5rem', borderRadius: '8px' }}>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>Alasan/Keterangan Mutasi Pensiun:</label>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    placeholder="Contoh: Pembersihan database periode Maret 2026"
                                                    value={retiringAlasan}
                                                    onChange={(e) => setRetiringAlasan(e.target.value)}
                                                />
                                            </div>
                                            <button
                                                className="btn-primary"
                                                onClick={handleBulkUpdatePensiun}
                                                disabled={bulkUpdateLoading}
                                                style={{ background: 'var(--success-color)', height: '42px', display: 'flex', alignItems: 'center', gap: '8px' }}
                                            >
                                                {bulkUpdateLoading ? <Loading variant="inline" text="Memproses..." /> : 'Nonaktifkan Semua Anggota (Pensiun)'}
                                            </button>
                                            <button
                                                onClick={() => { setRetiringPersonnel([]); setRetiringAlasan(''); }}
                                                className="btn-secondary"
                                                style={{ height: '42px' }}
                                            >
                                                Batal
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TAB: AUDIT LOG */}
                    {activeTab === 'audit' && (
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h2>Rekam Jejak Sistem (Audit Log)</h2>
                                    <p className="text-sm text-gray-500">Mencatat seluruh aktivitas berisiko tinggi seperti Mutasi/Penghapusan Personel.</p>
                                </div>
                                <div className="flex gap-2">
                                    <div className="search-bar" style={{ flex: 1, minWidth: '250px' }}>
                                        <Search size={18} />
                                        <input
                                            type="text"
                                            placeholder="Cari Riwayat Audit..."
                                            value={auditSearch}
                                            onChange={(e) => setAuditSearch(e.target.value)}
                                        />
                                    </div>
                                    <button className="btn-secondary" onClick={handleDownloadAudit} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}>
                                        <Download size={16} /> Unduh CSV
                                    </button>
                                </div>
                            </div>

                            {/* Audit Log Summary (Top) */}
                            {totalAuditItems > 0 && (
                                <div style={{ marginBottom: '1rem', background: 'var(--bg-color)', padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                    Menampilkan <strong>{(auditPage - 1) * auditItemsPerPage + 1} - {Math.min(auditPage * auditItemsPerPage, totalAuditItems)}</strong> dari <strong>{totalAuditItems}</strong> log transaksi keamanan.
                                </div>
                            )}

                            <div style={{ overflowX: 'auto' }}>
                                <table className="data-table" style={{ fontSize: '0.85rem' }}>
                                    <thead>
                                        <tr>
                                            <th>Waktu Eksekusi</th>
                                            <th>Operator / Aktor</th>
                                            <th>Tipe Aksi</th>
                                            <th>Rincian Deskripsi</th>
                                            <th>Alasan (Input Mandiri)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedAuditList.map(log => (
                                            <tr key={log.id}>
                                                <td style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>{new Date(log.createdAt).toLocaleString('id-ID')}</td>
                                                <td><span style={{ fontWeight: 600 }}>{log.userEmail}</span><br /><span style={{ fontSize: '0.8em', color: 'var(--primary-color)' }}>{log.satker}</span></td>
                                                <td><span style={{ background: 'var(--danger)', color: 'white', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' }}>{log.aksi}</span></td>
                                                <td>{log.deskripsi}</td>
                                                <td style={{ fontStyle: 'italic', color: '#b45309', fontWeight: 500 }}>"{log.alasan}"</td>
                                            </tr>
                                        ))}
                                        {auditList.length === 0 && (
                                            <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>Belum ada entri log keamanan yang tercatat.</td></tr>
                                        )}
                                        {totalAuditItems === 0 && auditSearch && (
                                            <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>Pencarian tidak menemukan entri log.</td></tr>
                                        )}
                                    </tbody>
                                </table>

                                {/* Audit Pagination Controls */}
                                {auditTotalPages > 1 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', padding: '0 0.5rem' }}>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                            Menampilkan {(auditPage - 1) * auditItemsPerPage + 1} - {Math.min(auditPage * auditItemsPerPage, totalAuditItems)} dari {totalAuditItems} log
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                                            <button
                                                onClick={() => setAuditPage(prev => Math.max(prev - 1, 1))}
                                                disabled={auditPage === 1}
                                                style={{
                                                    padding: '0.4rem 0.8rem',
                                                    borderRadius: '6px',
                                                    border: '1px solid var(--border-color)',
                                                    background: 'white',
                                                    cursor: auditPage === 1 ? 'not-allowed' : 'pointer',
                                                    opacity: auditPage === 1 ? 0.5 : 1,
                                                    fontSize: '0.85rem'
                                                }}
                                            >
                                                Sebelumnya
                                            </button>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                {[...Array(auditTotalPages)].map((_, i) => {
                                                    const pageNum = i + 1;
                                                    if (
                                                        pageNum === 1 ||
                                                        pageNum === auditTotalPages ||
                                                        (pageNum >= auditPage - 1 && pageNum <= auditPage + 1)
                                                    ) {
                                                        return (
                                                            <button
                                                                key={pageNum}
                                                                onClick={() => setAuditPage(pageNum)}
                                                                style={{
                                                                    width: '32px',
                                                                    height: '32px',
                                                                    borderRadius: '6px',
                                                                    border: '1px solid',
                                                                    borderColor: auditPage === pageNum ? 'var(--primary-color)' : 'var(--border-color)',
                                                                    background: auditPage === pageNum ? 'var(--primary-color)' : 'white',
                                                                    color: auditPage === pageNum ? 'white' : 'var(--text-color)',
                                                                    cursor: 'pointer',
                                                                    fontSize: '0.85rem',
                                                                    fontWeight: 600
                                                                }}
                                                            >
                                                                {pageNum}
                                                            </button>
                                                        );
                                                    } else if (
                                                        (pageNum === 2 && auditPage > 3) ||
                                                        (pageNum === auditTotalPages - 1 && auditPage < auditTotalPages - 2)
                                                    ) {
                                                        return <span key={pageNum} style={{ padding: '0 2px' }}>...</span>;
                                                    }
                                                    return null;
                                                })}
                                            </div>
                                            <button
                                                onClick={() => setAuditPage(prev => Math.min(prev + 1, auditTotalPages))}
                                                disabled={auditPage === auditTotalPages}
                                                style={{
                                                    padding: '0.4rem 0.8rem',
                                                    borderRadius: '6px',
                                                    border: '1px solid var(--border-color)',
                                                    background: 'white',
                                                    cursor: auditPage === auditTotalPages ? 'not-allowed' : 'pointer',
                                                    opacity: auditPage === auditTotalPages ? 0.5 : 1,
                                                    fontSize: '0.85rem'
                                                }}
                                            >
                                                Selanjutnya
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* MODALS */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`Form ${modalType.toUpperCase()}`} position={modalPosition}>
                <form onSubmit={handleSubmit}>

                    {/* User Form Form */}
                    {modalType === 'user' && (
                        <>
                            <div className="form-group">
                                <label>Email Akun</label>
                                <input type="email" name="email" className="form-input" value={formData.email || ''} onChange={handleFormChange} required />
                            </div>
                            <div className="form-group">
                                <label>Nama Lengkap / Display Name</label>
                                <input type="text" name="displayName" className="form-input" value={formData.displayName || ''} onChange={handleFormChange} placeholder="Masukkan nama lengkap user" />
                            </div>
                            <div className="form-group">
                                <label>Nomor HP / WhatsApp</label>
                                <input type="text" name="phone" className="form-input" value={formData.phone || ''} onChange={handleFormChange} placeholder="Contoh: 08123456789" />
                            </div>
                            <div className="form-group">
                                <label>Password {isEdit && <span style={{ fontSize: '0.8em', color: 'var(--danger)' }}>(Kosongkan jika tidak mau diganti)</span>}</label>
                                <input type="password" name="password" className="form-input" value={formData.password || ''} onChange={handleFormChange} required={!isEdit} />
                            </div>
                            <div className="form-group">
                                <label>Hak Akses / Role</label>
                                <select name="role" className="form-input" value={formData.role || 'OPERATOR_SATKER'} onChange={handleFormChange}>
                                    <option value="OPERATOR_SATKER">OPERATOR SATKER (Akses Terbatas Satker)</option>
                                    <option value="ADMIN_POLDA">ADMIN POLDA (Akses Keseluruhan Penuh)</option>
                                </select>
                            </div>
                            {formData.role === 'OPERATOR_SATKER' && (
                                <div className="form-group">
                                    <label>Tugaskan di Kesatuan (Satker)</label>
                                    <select name="satkerId" className="form-input" value={formData.satkerId || ''} onChange={handleFormChange} required>
                                        <option value="">-- Pilih Satker --</option>
                                        {satkerList.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
                                    </select>
                                </div>
                            )}
                        </>
                    )}

                    {/* Satker Form Form */}
                    {modalType === 'satker' && (
                        <>
                            <div className="form-group">
                                <label>Nama Satuan Kerja / Kesatuan</label>
                                <input type="text" name="nama" className="form-input" value={formData.nama || ''} onChange={handleFormChange} required placeholder="Contoh: Ditreskrimum Polda Jabar" />
                            </div>
                            <div className="form-group">
                                <label>Urutan Tampilan (Angka)</label>
                                <input type="number" name="urutan" className="form-input" value={formData.urutan || 0} onChange={handleFormChange} placeholder="0" />
                                <small className="text-muted">Gunakan angka untuk mengatur urutan (misal: 1, 2, 3). Jika 0, akan mengikuti hierarki standar.</small>
                            </div>
                        </>
                    )}

                    {/* App Settings Form Form */}
                    {modalType === 'app' && (
                        <>
                            <div className="form-group">
                                <label>Kunci Pengaturan</label>
                                <input type="text" name="key" className="form-input" value={formData.key || ''} disabled style={{ background: 'var(--bg-color)', cursor: 'not-allowed' }} />
                            </div>

                            {formData.key === 'FIELD_WAJIB_PELANGGARAN' ? (
                                <div className="form-group" style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                    <label style={{ fontSize: '1rem', color: 'var(--primary-color)' }}>Pilih Field Tambahan yang Diwajibkan (Admin)</label>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                                        Centang field-field di bawah ini untuk membuatnya wajib diisi oleh operator. Deskripsi Kasus, Nomor Surat, dan Jenis Pelanggaran sudah wajib secara bawaan sistem.
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 1fr)', gap: '0.75rem' }}>
                                        {[
                                            { id: 'pangkatSaatMelanggar', label: '1. Pangkat Saat Melanggar' },
                                            { id: 'jabatanSaatMelanggar', label: '2. Jabatan Saat Melanggar' },
                                            { id: 'satkerSaatMelanggar', label: '3. Satker Saat Melanggar' },
                                            { id: 'keteranganDasar', label: '4. Keterangan Dasar' },
                                            { id: 'fileDasar', label: '5. Berkas Dasar (LHP/LP)' },
                                            { id: 'filePutusan', label: '6. Berkas Putusan SKEP Hukuman' },
                                            { id: 'fileBanding', label: '7. Berkas Lampiran SKEP Banding' },
                                            { id: 'fileSp3', label: '8. Berkas Lampiran SP3 / SP4' },
                                            { id: 'fileSktt', label: '9. Berkas Surat Ket. Tidak Terbukti (SKTT)' },
                                            { id: 'fileSktb', label: '10. Berkas Surat Ket. Tidak Bersalah (SKTB)' },
                                            { id: 'fileSelesai', label: '11. Berkas Penyelesaian Damai (RJ)' },
                                            { id: 'fileRekomendasi', label: '12. Berkas Rekomendasi Pemulihan' }
                                        ].map(opt => {
                                            let isChecked = false;
                                            try { isChecked = JSON.parse(formData.value || '[]').includes(opt.id); } catch (e) { }
                                            return (
                                                <label key={opt.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={(e) => {
                                                            let arr = [];
                                                            try { arr = JSON.parse(formData.value || '[]'); } catch (e) { }
                                                            if (e.target.checked) arr.push(opt.id);
                                                            else arr = arr.filter(i => i !== opt.id);
                                                            setFormData(p => ({ ...p, value: JSON.stringify(arr) }));
                                                        }}
                                                        style={{ marginTop: '0.25rem' }}
                                                    />
                                                    <span>{opt.label}</span>
                                                </label>
                                            )
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <div className="form-group">
                                    <label>Nilai Konfigurasi (Value)</label>
                                    <input type="text" name="value" className="form-input" value={formData.value || ''} onChange={handleFormChange} required />
                                </div>
                            )}

                            <div className="form-group">
                                <label>Keterangan</label>
                                <textarea name="deskripsi" className="form-input" value={formData.deskripsi || ''} onChange={handleFormChange} rows="3" />
                            </div>
                        </>
                    )}

                    <div className="form-actions mt-4">
                        <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Batal</button>
                        <button type="submit" className="btn-primary">Simpan {modalType.toUpperCase()}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Pengaturan;
