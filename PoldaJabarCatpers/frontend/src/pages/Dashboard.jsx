import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Users, UserMinus, AlertCircle, History, Clock, Handshake, Search, X, ChevronLeft, ChevronRight, Eye, Plus, Edit2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import api from '../utils/api';
import { Toaster } from 'sonner';
import './Dashboard.css';
import Modal from '../components/Modal';
import PersonelFormModal from '../components/PersonelFormModal';
import PelanggaranFormModal from '../components/PelanggaranFormModal';

const StatCard = ({ title, value, icon, colorClass, onClick }) => (
    <div className={`stat-card ${colorClass}`} onClick={onClick} style={{ cursor: 'pointer', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-2px)' } }}>
        <div className="stat-icon-wrapper">
            {React.createElement(icon, { size: 24, className: "stat-icon" })}
        </div>
        <div className="stat-info">
            <h3>{value}</h3>
            <p>{title}</p>
        </div>
    </div>
);

const renderBadge = (value, colorVar, condition = value > 0, onClick = null) => {
    if (!condition) {
        return <span style={{ color: 'var(--text-muted)' }}>{value}</span>;
    }
    // warna khusus warning sedikit digelapkan di teks agar kontras atau pakai putih
    const isWarning = colorVar === 'warning';
    return (
        <span
            onClick={onClick}
            style={{
                padding: '2px 10px',
                borderRadius: '20px',
                fontSize: '0.85rem',
                fontWeight: 700,
                background: `var(--${colorVar})`,
                color: isWarning ? '#fff' : '#ffffff',
                display: 'inline-block',
                minWidth: '2.5rem',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                cursor: onClick ? 'pointer' : 'default',
                transition: 'transform 0.1s'
            }}
            className={onClick ? 'badge-clickable' : ''}
        >
            {value}
        </span>
    );
};

const Dashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        totalPersonel: 0, tidakAktif: 0, catpersAktif: 0, pernahTercatat: 0, belumRps: 0, perdamaian: 0
    });
    const [satkerStatsList, setSatkerStatsList] = useState([]);
    const [globalSearch, setGlobalSearch] = useState('');
    const [loading, setLoading] = useState(true);

    // Modal State
    const [modalData, setModalData] = useState({ isOpen: false, title: '', category: '', satkerId: null });
    const [modalList, setModalList] = useState([]);
    const [modalLoading, setModalLoading] = useState(false);
    const [modalSearch, setModalSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8; // Dikurangi agar ruang lapang
    const [selectedPersonelDetail, setSelectedPersonelDetail] = useState(null); // State histori
    const [detailLoading, setDetailLoading] = useState(false);
    const [isAddPersonelOpen, setIsAddPersonelOpen] = useState(false);

    // State Pelanggaran Edit & Delete
    const [isEditPelanggaran, setIsEditPelanggaran] = useState(false);
    const [selectedPelanggaran, setSelectedPelanggaran] = useState(null);
    const [isPelanggaranModalOpen, setIsPelanggaranModalOpen] = useState(false);
    const [deletePelanggaranModal, setDeletePelanggaranModal] = useState({ isOpen: false, id: null, alasan: '' });

    // State Personel Tambahan (Upload/Edit/Delete Langsung dr Modal)
    const [selectedPersonel, setSelectedPersonel] = useState(null);
    const [isEditPersonel, setIsEditPersonel] = useState(false);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, alasan: '', statusKeaktifan: '' });

    const fetchStats = async () => {
        try {
            const [resStats, resSatkerStats] = await Promise.all([
                api.get('/dashboard/stats'),
                api.get('/dashboard/satker-stats')
            ]);
            setStats(resStats.data.stats);
            setSatkerStatsList(resSatkerStats.data);
        } catch (error) {
            console.error("Gagal mengambil statistik dashboard", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    // Scroll to Top effect whenever Modal is opened
    useEffect(() => {
        if (modalData.isOpen) {
            const fetchDetailedPersonel = async () => {
                setModalLoading(true);
                try {
                    let url = `/personel?search=${modalSearch}`;
                    if (modalData.category) url += `&category=${modalData.category}`;
                    if (modalData.satkerId) url += `&satkerId=${modalData.satkerId}`;

                    const res = await api.get(url);
                    setModalList(res.data);
                    // Reset to page 1 every time search changes
                    setCurrentPage(1);
                } catch (error) {
                    console.error("Gagal mengambil data list personel", error);
                } finally {
                    setModalLoading(false);
                }
            };
            // Debounce for search
            const delayDebounceFn = setTimeout(() => {
                fetchDetailedPersonel();
            }, 500);
            return () => clearTimeout(delayDebounceFn);
        }
    }, [modalData, modalSearch]);

    const handleOpenModal = (title, category = '', satkerId = null) => {
        setModalSearch('');
        setCurrentPage(1);
        setModalData({ isOpen: true, title, category, satkerId });
    };

    const handleCloseModal = () => {
        setModalData({ ...modalData, isOpen: false });
        setModalList([]);
        setSelectedPersonelDetail(null);
    };

    const handleGlobalSearch = (e) => {
        if (e.key === 'Enter' && globalSearch.trim() !== '') {
            setModalData({ isOpen: true, title: `Pencarian: ${globalSearch}`, category: '', satkerId: null });
            setModalSearch(globalSearch);
            setCurrentPage(1);
            setGlobalSearch('');
        }
    };

    const handleViewDetail = async (id) => {
        setDetailLoading(true);
        try {
            const res = await api.get(`/personel/${id}`);
            setSelectedPersonelDetail(res.data);
        } catch (error) {
            console.error("Gagal memuat detail riwayat", error);
        } finally {
            setDetailLoading(false);
        }
    };

    const handleEditPelanggaran = (pel) => {
        setSelectedPelanggaran(pel);
        setIsEditPelanggaran(true);
        setIsPelanggaranModalOpen(true);
    };

    const confirmDeletePelanggaran = async () => {
        try {
            await api.delete(`/pelanggaran/${deletePelanggaranModal.id}`, { data: { alasan: deletePelanggaranModal.alasan } });
            toast.success('Catatan administratif pelanggaran telah berhasil dihapus (soft delete).');
            setDeletePelanggaranModal({ isOpen: false, id: null, alasan: '' });

            if (selectedPersonelDetail) {
                handleViewDetail(selectedPersonelDetail.id);
            }
            fetchStats();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Gagal menghapus pelanggaran.');
        }
    };

    const handleEditPersonel = (personel) => {
        setSelectedPersonel(personel);
        setIsEditPersonel(true);
        setIsAddPersonelOpen(true);
    };

    const triggerDeletePersonel = (id) => {
        setDeleteModal({ isOpen: true, id, alasan: '', statusKeaktifan: '' });
    };

    const confirmDeletePersonel = async () => {
        try {
            await api.delete(`/personel/${deleteModal.id}`, {
                data: {
                    alasan: deleteModal.alasan,
                    statusKeaktifan: deleteModal.statusKeaktifan
                }
            });
            toast.success('Personel berhasil dinonaktifkan / dihapus dari sistem (soft delete).');
            setDeleteModal({ isOpen: false, id: null, alasan: '', statusKeaktifan: '' });
            fetchStats();

            // Refresh modal list agar baris yang terhapus hilang
            if (modalData.isOpen) {
                const url = `/personel?search=${modalSearch}${modalData.category ? `&category=${modalData.category}` : ''}${modalData.satkerId ? `&satkerId=${modalData.satkerId}` : ''}`;
                const res = await api.get(url);
                setModalList(res.data);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Terjadi kesalahan saat menghapus personel.');
        }
    };

    // Pagination Logic
    const totalPages = Math.ceil(modalList.length / itemsPerPage);
    const currentList = modalList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    if (loading) return <div className="loading-state">Memuat Statistik...</div>;

    return (
        <>
            <Toaster position="top-right" richColors />
            <div className="dashboard animate-fade-in">
                <div className="dashboard-header" style={{ marginBottom: '1.5rem' }}>
                    <div>
                        <h1 className="page-title">Dashboard</h1>
                        <p className="page-subtitle">Ringkasan data {user?.role === 'ADMIN_POLDA' ? 'seluruh Satker Polda Jabar' : `Satker ${user?.satker?.nama}`}.</p>
                    </div>
                </div>

                {/* Pencarian Global (Personel) */}
                <div className="global-search-container mb-6" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div className="search-bar" style={{ flex: 1, maxWidth: '600px', padding: '0.75rem 1rem' }}>
                        <Search size={20} />
                        <input
                            type="text"
                            placeholder="Pencarian Personel / Catpers (Ketik NRP, NIP, Nama, lalu Enter)..."
                            value={globalSearch}
                            onChange={(e) => setGlobalSearch(e.target.value)}
                            onKeyDown={handleGlobalSearch}
                            style={{ fontSize: '1rem' }}
                        />
                    </div>
                    <button className="btn-primary" onClick={() => handleGlobalSearch({ key: 'Enter' })} style={{ padding: '0.75rem 1.5rem', height: '100%' }}>
                        Cari
                    </button>
                </div>

                <h2 className="section-title mt-4">Rekap Data</h2>
                <div className="stats-grid">
                    <StatCard title="Jumlah Personel" value={stats?.totalPersonel || 0} icon={Users} colorClass="card-primary" onClick={() => handleOpenModal('Total Seluruh Personel', '')} />
                    <StatCard title="Personel Tidak Aktif" value={stats?.tidakAktif || 0} icon={UserMinus} colorClass="card-secondary" onClick={() => handleOpenModal('Personel Tidak Aktif / Pensiun', 'tidakAktif')} />
                    <StatCard title="Catpers Aktif" value={stats?.catpersAktif || 0} icon={AlertCircle} colorClass="card-danger" onClick={() => handleOpenModal('Personel Dengan Catatan Aktif', 'catpersAktif')} />
                </div>

                <h2 className="section-title mt-2">Penyelesaian</h2>
                <div className="stats-grid">
                    <StatCard title="Pernah Tercatat" value={stats?.pernahTercatat || 0} icon={History} colorClass="card-warning" onClick={() => handleOpenModal('Personel Pernah Tercatat', 'pernahTercatat')} />
                    <StatCard title="Belum Mengajukan RPS" value={stats?.belumRps || 0} icon={Clock} colorClass="card-info" onClick={() => handleOpenModal('Tanggungan RPS Terbuka', 'belumRps')} />
                    <StatCard title="Perdamaian" value={stats?.perdamaian || 0} icon={Handshake} colorClass="card-success" onClick={() => handleOpenModal('Kasus Selesai (Perdamaian)', 'perdamaian')} />
                </div>

                <div className="table-container mt-4">
                    <div className="card-header mb-4">
                        <h3>Rekap Data Per Satker</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Klik baris tabel untuk melihat rincian personel pada Kesatuan tersebut.</p>
                    </div>
                    <div style={{ overflowX: 'auto', maxHeight: '500px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <table className="data-table" style={{ margin: 0, border: 'none' }}>
                            <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'white', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                                <tr>
                                    <th>Satuan Kerja (Satker)</th>
                                    <th style={{ textAlign: 'center' }}>Total Personel</th>
                                    <th style={{ textAlign: 'center' }}>Tidak Aktif</th>
                                    <th style={{ textAlign: 'center' }}>Catpers Aktif</th>
                                    <th style={{ textAlign: 'center' }}>Pernah Tercatat</th>
                                    <th style={{ textAlign: 'center' }}>Belum RPS</th>
                                    <th style={{ textAlign: 'center' }}>Perdamaian</th>
                                </tr>
                            </thead>
                            <tbody>
                                {satkerStatsList.length === 0 ? (
                                    <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>Data kesatuan tidak ditemukan</td></tr>
                                ) : (
                                    satkerStatsList.map(s => (
                                        <tr key={s.id} className="hover-row">
                                            <td style={{ fontWeight: 600, cursor: 'pointer' }} onClick={() => handleOpenModal(`Semua Personel: ${s.nama}`, '', s.id)}>
                                                <span style={{ color: 'var(--primary-color)' }}>{s.nama}</span>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                {renderBadge(s.totalPersonel, 'primary-color', s.totalPersonel > 0, () => handleOpenModal(`Semua Personel (${s.nama})`, '', s.id))}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                {renderBadge(s.tidakAktif, 'secondary-color', s.tidakAktif > 0, () => handleOpenModal(`Personel Tidak Aktif (${s.nama})`, 'tidakAktif', s.id))}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                {renderBadge(s.catpersAktif, 'danger', s.catpersAktif > 0, () => handleOpenModal(`Catatan Aktif (${s.nama})`, 'catpersAktif', s.id))}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                {renderBadge(s.pernahTercatat, 'warning', s.pernahTercatat > 0, () => handleOpenModal(`Pernah Tercatat (${s.nama})`, 'pernahTercatat', s.id))}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                {renderBadge(s.belumRps, 'info', s.belumRps > 0, () => handleOpenModal(`Belum RPS (${s.nama})`, 'belumRps', s.id))}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                {renderBadge(s.perdamaian, 'success', s.perdamaian > 0, () => handleOpenModal(`Perdamaian (${s.nama})`, 'perdamaian', s.id))}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <Modal isOpen={modalData.isOpen} onClose={handleCloseModal} title={selectedPersonelDetail ? `Catatan: ${selectedPersonelDetail.namaLengkap}` : `Detail Data: ${modalData.title}`} maxWidth="90%">

                {selectedPersonelDetail ? (
                    // VIEW DETAIL HISTORI PELANGGARAN
                    <div>
                        <button className="btn-secondary mb-4" onClick={() => setSelectedPersonelDetail(null)}>
                            <ChevronLeft size={16} /> Kembali ke Daftar
                        </button>

                        {detailLoading ? <div className="loading-state py-4">Memuat Rekam Jejak...</div> : (
                            <div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'var(--bg-color)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                                    <div><strong style={{ color: 'var(--text-muted)' }}>NRP / NIP</strong><br />{selectedPersonelDetail.nrpNip}</div>
                                    <div><strong style={{ color: 'var(--text-muted)' }}>Pangkat / Gol.</strong><br />{selectedPersonelDetail.pangkat}</div>
                                    <div><strong style={{ color: 'var(--text-muted)' }}>Jabatan</strong><br />{selectedPersonelDetail.jabatan}</div>
                                    <div><strong style={{ color: 'var(--text-muted)' }}>Kesatuan</strong><br />{selectedPersonelDetail.satker?.nama}</div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <h3 style={{ margin: 0 }}>Riwayat Catatan Personel ({selectedPersonelDetail.pelanggaran?.length || 0})</h3>
                                    {(user?.role === 'ADMIN_POLDA' || selectedPersonelDetail.satkerId === user?.satkerId) && (
                                        <button
                                            className="btn-primary"
                                            style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                                            onClick={() => {
                                                setSelectedPelanggaran(null);
                                                setIsEditPelanggaran(false);
                                                setIsPelanggaranModalOpen(true);
                                            }}
                                        >
                                            <Plus size={15} /> Tambah Catatan
                                        </button>
                                    )}
                                </div>
                                <div style={{ overflowX: 'auto', marginTop: '0.5rem' }}>
                                    <table className="data-table" style={{ fontSize: '0.85em' }}>
                                        <thead>
                                            <tr>
                                                <th>TANGGAL</th>
                                                <th>WUJUD PERBUATAN</th>
                                                <th>PENYELESAIAN</th>
                                                <th>STATUS RPS</th>
                                                {user?.role === 'ADMIN_POLDA' && <th>AKSI</th>}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedPersonelDetail.pelanggaran?.length === 0 ? (
                                                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '1rem', color: 'var(--success)' }}>Personel ini bersih dari catatan pelanggaran.</td></tr>
                                            ) : (
                                                selectedPersonelDetail.pelanggaran?.map(pel => (
                                                    <tr key={pel.id}>
                                                        <td>{pel.tanggalSurat ? format(new Date(pel.tanggalSurat), 'dd/MM/yyyy') : format(new Date(pel.createdAt), 'dd/MM/yyyy')}</td>
                                                        <td>
                                                            <div style={{ fontWeight: 600 }}>{pel.wujudPerbuatan}</div>
                                                            {['TIDAK_TERBUKTI', 'PERDAMAIAN'].includes(pel.statusPenyelesaian) ? null : (
                                                                <div style={{ marginTop: '4px' }}>
                                                                    {pel.jenisSidang && <><strong style={{ color: 'var(--danger)', fontSize: '0.85em' }}>Sidang {pel.jenisSidang}</strong><br /></>}
                                                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85em' }}>{pel.hukuman || '-'}</span>
                                                                    {pel.nomorSkep && <div style={{ fontSize: '0.85em', color: 'var(--info)', marginTop: '2px' }}><strong>SKEP:</strong> {pel.nomorSkep}</div>}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td><span style={{ padding: '2px 8px', borderRadius: '12px', background: 'var(--border-color)', fontWeight: 600 }}>{pel.statusPenyelesaian.replace('_', ' ')}</span></td>
                                                        <td>
                                                            {pel.tanggalRekomendasi ? (
                                                                <div>
                                                                    <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>Terbit {format(new Date(pel.tanggalRekomendasi), 'dd/MM/yyyy')}</span>
                                                                    {pel.nomorRekomendasi && <div style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>No: {pel.nomorRekomendasi}</div>}
                                                                    {pel.fileRekomendasiUrl && <div style={{ fontSize: '0.8em', marginTop: '2px' }}><a href={`http://localhost:5000${pel.fileRekomendasiUrl}`} target="_blank" rel="noreferrer" style={{ color: 'var(--primary-color)' }}>Lihat Berkas</a></div>}
                                                                </div>
                                                            ) : (
                                                                pel.tanggalBisaAjukanRps && new Date() < new Date(pel.tanggalBisaAjukanRps) ? (
                                                                    <div>
                                                                        <span style={{ color: 'var(--warning)', fontWeight: 600 }}>&#9203; Menunggu Waktu RPS</span>
                                                                        <div style={{ fontSize: '0.8em', color: 'var(--text-muted)' }}>Bisa diajukan pasca: {format(new Date(pel.tanggalBisaAjukanRps), 'dd/MM/yyyy')}</div>
                                                                    </div>
                                                                ) : (
                                                                    <span style={{ color: 'var(--danger)' }}>Belum Ada RPS</span>
                                                                )
                                                            )}
                                                        </td>
                                                        {user?.role === 'ADMIN_POLDA' && (
                                                            <td>
                                                                <div className="flex gap-2">
                                                                    <button className="btn-icon" onClick={() => handleEditPelanggaran(pel)} title="Revisi/Edit Pelanggaran"><Edit2 size={16} /></button>
                                                                    <button className="btn-icon delete" onClick={() => setDeletePelanggaranModal({ isOpen: true, id: pel.id, alasan: '' })} title="Hapus Data (Soft Delete)"><Trash2 size={16} /></button>
                                                                </div>
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    // VIEW DAFTAR PERSONEL
                    <>
                        <div className="page-actions mb-4">
                            <div className="search-bar" style={{ width: '100%' }}>
                                <Search size={18} />
                                <input
                                    type="text"
                                    placeholder="Cari Nama atau NIP/NRP..."
                                    value={modalSearch}
                                    onChange={(e) => setModalSearch(e.target.value)}
                                />
                            </div>
                        </div>

                        {modalLoading ? (
                            <div className="loading-state py-8">Mensinkronisasi Data...</div>
                        ) : (
                            <>
                                {/* Batasan Tinggi Tabel List Mengikuti Dimensi Layar (Max Height & Overflow y) */}
                                <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 22rem)' }}>
                                    <table className="data-table" style={{ fontSize: '0.85em' }}>
                                        <thead>
                                            <tr>
                                                <th>NRP / NIP</th>
                                                <th>Nama Lengkap</th>
                                                <th>Pangkat</th>
                                                <th>Kesatuan</th>
                                                <th>Status Personel</th>
                                                <th>Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {currentList.length === 0 ? (
                                                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Pencarian / Kategori tidak menghasilkan temuan.</td></tr>
                                            ) : (
                                                currentList.map(p => (
                                                    <tr key={p.id}>
                                                        <td><span style={{ fontWeight: 600 }}>{p.nrpNip}</span><br /><small>{p.jenisPegawai}</small></td>
                                                        <td>{p.namaLengkap}</td>
                                                        <td>{p.pangkat}</td>
                                                        <td>{p.satker?.nama || '-'}</td>
                                                        <td>
                                                            <span style={{
                                                                padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
                                                                background: p.statusPersonel === 'Ada Catatan' ? 'var(--danger)' : p.statusPersonel === 'Pernah Tercatat' ? 'var(--warning)' : 'var(--success)',
                                                                color: 'white'
                                                            }}>
                                                                {p.statusPersonel}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <button
                                                                className="btn-icon"
                                                                style={{ color: 'var(--info)' }}
                                                                onClick={() => handleViewDetail(p.id)}
                                                                title="Lihat Histori Catpers"
                                                            >
                                                                <Eye size={18} /> Lihat Catatan
                                                            </button>
                                                            {(user?.role === 'ADMIN_POLDA' || p.satkerId === user?.satkerId) && (
                                                                <>
                                                                    <button className="btn-icon" onClick={() => handleEditPersonel(p)} title="Edit Data Dasar Personel"><Edit2 size={18} /></button>
                                                                    <button className="btn-icon delete" onClick={() => triggerDeletePersonel(p.id)} title="Nonaktifkan / Hapus"><Trash2 size={18} /></button>
                                                                </>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination Controls */}
                                {totalPages > 1 && (
                                    <div className="flex justify-between items-center mt-4 pt-4" style={{ borderTop: '1px solid var(--border)', fontSize: '0.9rem' }}>
                                        <span>Menampilkan {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, modalList.length)} dari {modalList.length}</span>
                                        <div className="flex gap-2">
                                            <button
                                                className="btn-secondary"
                                                style={{ padding: '4px 8px' }}
                                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                disabled={currentPage === 1}
                                            >
                                                <ChevronLeft size={16} /> Prev
                                            </button>
                                            <button
                                                className="btn-secondary"
                                                style={{ padding: '4px 8px' }}
                                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                                disabled={currentPage === totalPages}
                                            >
                                                Next <ChevronRight size={16} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}
            </Modal>

            <PersonelFormModal
                isOpen={isAddPersonelOpen}
                onClose={() => { setIsAddPersonelOpen(false); setIsEditPersonel(false); setSelectedPersonel(null); }}
                onSuccess={async () => {
                    fetchStats();
                    if (modalData.isOpen) {
                        const url = `/personel?search=${modalSearch}${modalData.category ? `&category=${modalData.category}` : ''}${modalData.satkerId ? `&satkerId=${modalData.satkerId}` : ''}`;
                        const res = await api.get(url);
                        setModalList(res.data);
                    }
                }}
                isEdit={isEditPersonel}
                initialData={selectedPersonel}
            />

            <PelanggaranFormModal
                isOpen={isPelanggaranModalOpen}
                onClose={() => { setIsPelanggaranModalOpen(false); setSelectedPelanggaran(null); }}
                onSuccess={() => {
                    fetchStats();
                    if (selectedPersonelDetail) handleViewDetail(selectedPersonelDetail.id);
                }}
                isEdit={isEditPelanggaran}
                initialData={selectedPelanggaran}
                targetPersonel={selectedPersonelDetail}
            />

            <Modal isOpen={deletePelanggaranModal.isOpen} onClose={() => setDeletePelanggaranModal({ isOpen: false, id: null, alasan: '' })} title="Konfirmasi Hapus Riwayat">
                <div style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>
                    Tindakan ini akan menghapus jejak secara administratif (soft delete) untuk data pelanggaran ini. Tindakan dan alasan akan direkam pada Log Audit sistem.
                </div>
                <div className="form-group w-full relative">
                    <label style={{ color: 'var(--danger)', fontWeight: 'bold' }}>Alasan Tindakan Penghapusan *</label>
                    <textarea
                        className="form-input"
                        rows="3"
                        value={deletePelanggaranModal.alasan}
                        onChange={(e) => setDeletePelanggaranModal({ ...deletePelanggaranModal, alasan: e.target.value })}
                        placeholder="Ketik mengapa riwayat pelanggaran ini dihapus..."
                        autoFocus
                    ></textarea>
                </div>
                <div className="form-actions mt-4">
                    <button type="button" className="btn-secondary" onClick={() => setDeletePelanggaranModal({ isOpen: false, id: null, alasan: '' })}>Batal</button>
                    <button type="button" onClick={confirmDeletePelanggaran} className="btn-primary" style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }} disabled={!deletePelanggaranModal.alasan.trim()}>
                        <Trash2 size={16} /> Konfirmasi Hapus
                    </button>
                </div>
            </Modal>

            {/* Modal Penghapusan (Audit Log / Soft Delete / Nonaktif) */}
            <Modal isOpen={deleteModal.isOpen} onClose={() => setDeleteModal({ isOpen: false, id: null, alasan: '', statusKeaktifan: '' })} title="Konfirmasi Nonaktif / Hapus Personel">
                <div style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>
                    Tindakan ini akan mengarsipkan data ke basis *Tidak Aktif* dan membebaskan NRP/NIP untuk pendaftar baru.
                </div>

                <div className="form-group w-full relative" style={{ marginBottom: '1rem' }}>
                    <label style={{ color: 'var(--danger)', fontWeight: 'bold' }}>Pilih Status Data *</label>
                    <select
                        className="form-input"
                        value={deleteModal.statusKeaktifan}
                        onChange={(e) => setDeleteModal({ ...deleteModal, statusKeaktifan: e.target.value })}
                        required
                    >
                        <option value="">-- Pilih Status Update --</option>
                        <option value="MENINGGAL_DUNIA">Meninggal Dunia</option>
                        <option value="PENSIUN">Pensiun Dini / Mutasi Keluar</option>
                        <option value="DIHAPUS">Data Dihapus (Koreksi Berkas)</option>
                    </select>
                </div>

                <div className="form-group w-full relative">
                    <label style={{ color: 'var(--danger)', fontWeight: 'bold' }}>Alasan Tindakan (Wajib Audit Log) *</label>
                    <textarea
                        className="form-input"
                        rows="3"
                        value={deleteModal.alasan}
                        onChange={(e) => setDeleteModal({ ...deleteModal, alasan: e.target.value })}
                        placeholder="Contoh: Kesalahan entri, Pegawai pensiun dini, PTDH, dsb..."
                        autoFocus
                    ></textarea>
                </div>
                <div className="form-actions mt-4">
                    <button type="button" className="btn-secondary" onClick={() => setDeleteModal({ isOpen: false, id: null, alasan: '', statusKeaktifan: '' })}>Batal</button>
                    <button type="button" onClick={confirmDeletePersonel} className="btn-primary" style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }} disabled={!deleteModal.alasan.trim() || !deleteModal.statusKeaktifan}>
                        <Trash2 size={16} /> Ya, Proses
                    </button>
                </div>
            </Modal>

            {/* Floating Action Button (Premium Theme) */}
            <button
                className="floating-add-btn"
                onClick={() => setIsAddPersonelOpen(true)}
                title="Tambah Personel Baru"
            >
                <Plus size={28} />
            </button>
        </>
    );
};

export default Dashboard;
