import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Settings, Users, Building, ShieldCheck, Plus, Edit2, Trash2, FileText } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import api from '../utils/api';
import Modal from '../components/Modal';

const Pengaturan = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('users'); // users | satker | app

    // States for data
    const [usersList, setUsersList] = useState([]);
    const [satkerList, setSatkerList] = useState([]);
    const [pengaturanList, setPengaturanList] = useState([]);
    const [auditList, setAuditList] = useState([]);
    const [loading, setLoading] = useState(false);

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState(''); // 'user', 'satker', 'app'
    const [isEdit, setIsEdit] = useState(false);
    const [formData, setFormData] = useState({});

    // Fetch master data
    const fetchData = async () => {
        try {
            setLoading(true);
            const [resUsers, resSatker, resPengaturan, resAudit] = await Promise.all([
                api.get('/users'),
                api.get('/satker'),
                api.get('/pengaturan'),
                api.get('/audit')
            ]);
            setUsersList(resUsers.data);
            setSatkerList(resSatker.data);
            setPengaturanList(resPengaturan.data);
            setAuditList(resAudit.data);
        } catch {
            toast.error('Gagal memuat data pengaturan. Pastikan Anda memiliki hak akses Admin.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.role === 'ADMIN_POLDA') {
            fetchData();
        }
    }, [user]);

    if (user?.role !== 'ADMIN_POLDA') {
        return <div className="p-8 text-center text-[var(--danger)] font-semibold mt-10">AKSES DITOLAK. Hanya Admin Polda yang dapat mengakses halaman ini.</div>;
    }

    // Handlers
    const handleOpenModal = (type, data = null) => {
        setModalType(type);
        setIsEdit(!!data);

        switch (type) {
            case 'user':
                setFormData(data ? { ...data, password: '' } : { id: '', email: '', password: '', role: 'OPERATOR_SATKER', satkerId: '' });
                break;
            case 'satker':
                setFormData(data || { id: '', nama: '' });
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
                    await api.put(`/users/${formData.id}`, payload);
                    toast.success('User berhasil diupdate');
                } else {
                    await api.post('/users', payload);
                    toast.success('User berhasil ditambahkan');
                }
            } else if (modalType === 'satker') {
                if (isEdit) {
                    await api.put(`/satker/${formData.id}`, { nama: formData.nama });
                    toast.success('Satker berhasil diupdate');
                } else {
                    await api.post('/satker', { nama: formData.nama });
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

    return (
        <div className="animate-fade-in">
            <Toaster position="top-right" richColors />

            <div className="page-header mb-4">
                <h1 className="page-title">Sistem Pengaturan Polda Jabar</h1>
                <p className="page-subtitle">Kelola akses Pengguna, struktur Satuan Kerja, dan Variabel Sistem.</p>
            </div>

            {/* Tabs */}
            <div className="tabs-container" style={{ display: 'flex', gap: '1rem', borderBottom: '2px solid var(--border-color)', marginBottom: '2rem' }}>
                <button
                    onClick={() => setActiveTab('users')}
                    style={{ padding: '0.8rem 1.5rem', fontWeight: 600, borderBottom: activeTab === 'users' ? '3px solid var(--primary-color)' : '3px solid transparent', color: activeTab === 'users' ? 'var(--primary-color)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s', background: 'transparent' }}>
                    <Users size={18} /> Manajemen User
                </button>
                <button
                    onClick={() => setActiveTab('satker')}
                    style={{ padding: '0.8rem 1.5rem', fontWeight: 600, borderBottom: activeTab === 'satker' ? '3px solid var(--primary-color)' : '3px solid transparent', color: activeTab === 'satker' ? 'var(--primary-color)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s', background: 'transparent' }}>
                    <Building size={18} /> Kesatuan / Satker
                </button>
                <button
                    onClick={() => setActiveTab('app')}
                    style={{ padding: '0.8rem 1.5rem', fontWeight: 600, borderBottom: activeTab === 'app' ? '3px solid var(--primary-color)' : '3px solid transparent', color: activeTab === 'app' ? 'var(--primary-color)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s', background: 'transparent' }}>
                    <Settings size={18} /> Pengaturan Aplikasi
                </button>
                <button
                    onClick={() => setActiveTab('audit')}
                    style={{ padding: '0.8rem 1.5rem', fontWeight: 600, borderBottom: activeTab === 'audit' ? '3px solid var(--primary-color)' : '3px solid transparent', color: activeTab === 'audit' ? 'var(--primary-color)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s', background: 'transparent' }}>
                    <FileText size={18} /> Audit Log
                </button>
            </div>

            {loading ? <div className="loading-state">Memuat Konfigurasi...</div> : (
                <div className="tab-content">
                    {/* TAB: USERS */}
                    {activeTab === 'users' && (
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h2>Daftar Akun Pengguna</h2>
                                <button className="btn-primary" onClick={() => handleOpenModal('user')}><Plus size={18} /> Tambah User</button>
                            </div>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Email</th>
                                        <th>Role Akses</th>
                                        <th>Satuan Kerja (Unit)</th>
                                        <th>Ditambahkan</th>
                                        <th>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {usersList.map(u => (
                                        <tr key={u.id}>
                                            <td style={{ fontWeight: 500 }}>{u.email}</td>
                                            <td><span style={{ fontSize: '0.8rem', padding: '4px 10px', borderRadius: '20px', background: u.role === 'ADMIN_POLDA' ? 'var(--accent-color)' : 'var(--border-color)', color: u.role === 'ADMIN_POLDA' ? 'white' : 'var(--text-color)' }}>{u.role.replace('_', ' ')}</span></td>
                                            <td>{u.satker?.nama || <span className="text-gray-400 italic">Polda Utama (Semua Akses)</span>}</td>
                                            <td style={{ fontSize: '0.9em', color: 'var(--text-muted)' }}>{new Date(u.createdAt).toLocaleDateString('id-ID')}</td>
                                            <td>
                                                <div className="action-btns">
                                                    <button className="btn-icon" onClick={() => handleOpenModal('user', u)} title="Edit"><Edit2 size={18} /></button>
                                                    {u.id !== user.id && <button className="btn-icon delete" onClick={() => handleDelete('user', u.id)} title="Hapus"><Trash2 size={18} /></button>}
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
                                <button className="btn-primary" onClick={() => handleOpenModal('satker')}><Plus size={18} /> Tambah Satker</button>
                            </div>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Nama Satker / Kesatuan</th>
                                        <th>Dibuat Pada</th>
                                        <th>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {satkerList.map(s => (
                                        <tr key={s.id}>
                                            <td style={{ color: 'var(--text-muted)' }}>#{s.id}</td>
                                            <td style={{ fontWeight: 600 }}>{s.nama}</td>
                                            <td style={{ fontSize: '0.9em', color: 'var(--text-muted)' }}>{new Date(s.createdAt).toLocaleDateString('id-ID')}</td>
                                            <td>
                                                <div className="action-btns">
                                                    <button className="btn-icon" onClick={() => handleOpenModal('satker', s)} title="Edit"><Edit2 size={18} /></button>
                                                    <button className="btn-icon delete" onClick={() => handleDelete('satker', s.id)} title="Hapus Kesatuan"><Trash2 size={18} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
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
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                {pengaturanList.map(sett => (
                                    <div key={sett.key} style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-color)' }}><ShieldCheck size={20} /> <h3 style={{ margin: 0 }}>{sett.key.replace(/_/g, ' ')}</h3></div>
                                            <button className="btn-icon" onClick={() => handleOpenModal('app', sett)} title="Ubah Konfigurasi"><Edit2 size={18} /></button>
                                        </div>
                                        <div style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>{sett.value}</div>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{sett.deskripsi || 'Tidak ada deskripsi'}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* TAB: AUDIT LOG */}
                    {activeTab === 'audit' && (
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h2>Rekam Jejak Sistem (Audit Log)</h2>
                                <p className="text-sm text-gray-500">Mencatat seluruh aktivitas berisiko tinggi seperti Mutasi/Penghapusan Personel.</p>
                            </div>
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
                                        {auditList.length === 0 ? (
                                            <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>Belum ada entri log keamanan yang tercatat.</td></tr>
                                        ) : auditList.map(log => (
                                            <tr key={log.id}>
                                                <td style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>{new Date(log.createdAt).toLocaleString('id-ID')}</td>
                                                <td><span style={{ fontWeight: 600 }}>{log.userEmail}</span><br /><span style={{ fontSize: '0.8em', color: 'var(--primary-color)' }}>{log.satker}</span></td>
                                                <td><span style={{ background: 'var(--danger)', color: 'white', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' }}>{log.aksi}</span></td>
                                                <td>{log.deskripsi}</td>
                                                <td style={{ fontStyle: 'italic', color: '#b45309', fontWeight: 500 }}>"{log.alasan}"</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* MODALS */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`Form ${modalType.toUpperCase()}`}>
                <form onSubmit={handleSubmit}>

                    {/* User Form Form */}
                    {modalType === 'user' && (
                        <>
                            <div className="form-group">
                                <label>Email Akun</label>
                                <input type="email" name="email" className="form-input" value={formData.email || ''} onChange={handleFormChange} required />
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
                        <div className="form-group">
                            <label>Nama Satuan Kerja / Kesatuan</label>
                            <input type="text" name="nama" className="form-input" value={formData.nama || ''} onChange={handleFormChange} required placeholder="Contoh: Ditreskrimum Polda Jabar" />
                        </div>
                    )}

                    {/* App Settings Form Form */}
                    {modalType === 'app' && (
                        <>
                            <div className="form-group">
                                <label>Kunci Pengaturan</label>
                                <input type="text" name="key" className="form-input" value={formData.key || ''} disabled style={{ background: 'var(--bg-color)', cursor: 'not-allowed' }} />
                            </div>
                            <div className="form-group">
                                <label>Nilai Konfigurasi (Value)</label>
                                <input type="text" name="value" className="form-input" value={formData.value || ''} onChange={handleFormChange} required />
                            </div>
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
