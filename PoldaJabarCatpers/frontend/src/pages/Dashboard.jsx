import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
    Users, FileWarning, Search, ShieldCheck,
    Clock, CheckCircle, RefreshCw, Printer, Download, UserMinus, Plus, Trash2, Edit2, XCircle, Eye, ChevronLeft, ChevronRight, History, LayoutDashboard, AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import api from '../utils/api';
import { Toaster, toast } from 'sonner';
import './Dashboard.css';
import Modal from '../components/Modal';
import PersonelFormModal from '../components/PersonelFormModal';
import PersonelHistoryModal from '../components/PersonelHistoryModal';
import Loading from '../components/Loading';

// Lazy-load pdfGenerator hanya saat dibutuhkan
const getExportPersonelPDF = () => import('../utils/pdfGenerator').then(m => m.exportPersonelPDF);


const StatCard = ({ title, value, icon: Icon, colorClass, onClick }) => {
    return (
        <div className={`stat-card ${colorClass}`} onClick={onClick} title="Klik untuk melihat detail">
            <div className="stat-card-top">
                <div className="stat-info">
                    <h3>{value}</h3>
                    <p>{title}</p>
                </div>
                <div className="stat-icon-wrapper">
                    <Icon size={24} className="stat-icon" />
                </div>
            </div>
        </div>
    );
};

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

const STALE_TIME_MS = 30_000; // 30 detik — tidak refetch jika data masih segar

const Dashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const lastFetchRef = useRef(0); // timestamp fetch terakhir (ms)

    const [stats, setStats] = useState(() => {
        try { return JSON.parse(localStorage.getItem('dashboard_stats')) || { totalPersonel: 0, tidakAktif: 0, catpersAktif: 0, pernahTercatat: 0, belumRekomendasi: 0 }; }
        catch { return { totalPersonel: 0, tidakAktif: 0, catpersAktif: 0, pernahTercatat: 0, belumRekomendasi: 0 }; }
    });
    const [satkerStatsList, setSatkerStatsList] = useState(() => {
        try { return JSON.parse(localStorage.getItem('dashboard_satker_stats')) || []; }
        catch { return []; }
    });
    const [globalSearch, setGlobalSearch] = useState('');
    const [satkerSearch, setSatkerSearch] = useState('');
    const [loading, setLoading] = useState(true);

    // Sorting State
    const [sortConfig, setSortConfig] = useState({ key: 'urutan', direction: 'asc' });
    const [personelSortConfig, setPersonelSortConfig] = useState({ key: 'nrpNip', direction: 'asc' });

    // Modal State
    const [modalData, setModalData] = useState({ isOpen: false, title: '', category: '', satkerId: null });
    const [modalList, setModalList] = useState([]);
    const [modalLoading, setModalLoading] = useState(false);
    const [modalSearch, setModalSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;
    const [selectedPersonelDetail, setSelectedPersonelDetail] = useState(null);
    const [isAddPersonelOpen, setIsAddPersonelOpen] = useState(false);

    const [selectedPersonel, setSelectedPersonel] = useState(null);
    const [isEditPersonel, setIsEditPersonel] = useState(false);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, alasan: '', statusKeaktifan: '' });
    const [rejectModal, setRejectModal] = useState({ isOpen: false, id: null, type: null, catatan: '' });
    const [restoreModal, setRestoreModal] = useState({ isOpen: false, id: null, alasan: '' });

    // Fetch stats — dengan stale-time agar tidak refetch berulang dalam 30 detik
    const fetchStats = useCallback(async ({ force = false } = {}) => {
        const now = Date.now();
        if (!force && now - lastFetchRef.current < STALE_TIME_MS) return;

        const fetchMainStats = async () => {
            try {
                const res = await api.get('/dashboard/stats');
                const newStats = { ...res.data.stats, belumRekomendasi: res.data.stats.belumRps };
                setStats(newStats);
                localStorage.setItem('dashboard_stats', JSON.stringify(newStats));
            } catch (error) {
                console.error('Gagal mengambil statistik utama', error);
            }
        };

        const fetchSatkerStats = async () => {
            try {
                const res = await api.get('/dashboard/satker-stats');
                const newSatkerStats = res.data.map(s => ({ ...s, belumRekomendasi: s.belumRps }));
                setSatkerStatsList(newSatkerStats);
                localStorage.setItem('dashboard_satker_stats', JSON.stringify(newSatkerStats));
            } catch (error) {
                console.error('Gagal mengambil statistik satker', error);
            }
        };

        setLoading(true);
        lastFetchRef.current = now;
        await Promise.allSettled([fetchMainStats(), fetchSatkerStats()]);
        setLoading(false);
    }, []);

    const requestSort = useCallback((key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    }, []);

    const requestPersonelSort = useCallback((key) => {
        setPersonelSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    }, []);

    // useMemo: hitung derivasi hanya jika dependensi berubah
    const filteredSatkerStats = useMemo(() =>
        satkerStatsList.filter(s => s.nama.toLowerCase().includes(satkerSearch.toLowerCase())),
        [satkerStatsList, satkerSearch]
    );

    const sortedSatkerStats = useMemo(() =>
        [...filteredSatkerStats].sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
            if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        }),
        [filteredSatkerStats, sortConfig]
    );

    const sortedModalList = useMemo(() =>
        [...modalList].sort((a, b) => {
            let valA = personelSortConfig.key === 'satker' ? (a.satker?.nama || '') : a[personelSortConfig.key];
            let valB = personelSortConfig.key === 'satker' ? (b.satker?.nama || '') : b[personelSortConfig.key];
            if (valA < valB) return personelSortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return personelSortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        }),
        [modalList, personelSortConfig]
    );

    useEffect(() => {
        fetchStats({ force: true }); // Initial load selalu force fetch
    }, [fetchStats]);

    const fetchModalList = useCallback(async (overrideModalData) => {
        const target = overrideModalData || modalData;
        if (!target.isOpen) return;
        setModalLoading(true);
        try {
            let url = `/personel?search=${modalSearch}`;
            if (target.category) url += `&category=${target.category}`;
            if (target.satkerId) url += `&satkerId=${target.satkerId}`;
            const res = await api.get(url);
            setModalList(res.data);
        } catch (error) {
            console.error('Gagal mengambil data list personel', error);
        } finally {
            setModalLoading(false);
        }
    }, [modalData, modalSearch]);

    // Smart refresh: setelah action, paksa fetch stats + modal list paralel
    const refreshAfterAction = useCallback(async () => {
        await Promise.allSettled([
            fetchStats({ force: true }),
            fetchModalList()
        ]);
    }, [fetchStats, fetchModalList]);

    // Debounced effect untuk modal search
    useEffect(() => {
        if (modalData.isOpen) {
            const delayDebounceFn = setTimeout(() => {
                fetchModalList();
                setCurrentPage(1);
            }, 500);
            return () => clearTimeout(delayDebounceFn);
        }
    }, [modalData, modalSearch]);

    const handleOpenModal = useCallback((title, category = '', satkerId = null) => {
        setModalSearch('');
        setCurrentPage(1);
        setModalData({ isOpen: true, title, category, satkerId });
    }, []);

    const handleCloseModal = useCallback(() => {
        // Hapus fetchStats() di sini — stats sudah direfresh setelah setiap action
        setModalData(prev => ({ ...prev, isOpen: false }));
        setModalList([]);
        setSelectedPersonelDetail(null);
    }, []);

    const handlePrintModal = () => {
        window.print();
    };

    const handleExportExcel = () => {
        if (!sortedModalList || sortedModalList.length === 0) {
            toast.error("Tidak ada data untuk diekspor");
            return;
        }

        const headers = ["NRP/NIP", "Nama Lengkap", "Pangkat", "Kesatuan", "Status Personel"];
        const csvRows = [];
        csvRows.push(headers.join(','));

        sortedModalList.forEach(p => {
            const row = [
                `"${p.nrpNip || ''}"`,
                `"${p.namaLengkap || ''}"`,
                `"${p.pangkat || ''}"`,
                `"${p.satker?.nama || '-'}"`,
                `"${p.statusPersonel || '-'}"`
            ];
            csvRows.push(row.join(','));
        });

        const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Export_${modalData.title.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleGlobalSearch = useCallback((e) => {
        if (e.key === 'Enter' && globalSearch.trim() !== '') {
            setModalData({ isOpen: true, title: `Pencarian: ${globalSearch}`, category: '', satkerId: null });
            setModalSearch(globalSearch);
            setCurrentPage(1);
            setGlobalSearch('');
        }
    }, [globalSearch]);

    const handleRejectPelanggaran = useCallback((id) => {
        setRejectModal({ isOpen: true, id, type: 'pelanggaran', catatan: '' });
    }, []);

    const confirmReject = useCallback(async () => {
        if (!rejectModal.catatan.trim()) {
            toast.error('Gagal: Catatan revisi wajib diisi.');
            return;
        }
        try {
            const url = rejectModal.type === 'personel' ? `/personel/reject/${rejectModal.id}` : `/pelanggaran/reject/${rejectModal.id}`;
            await api.post(url, { catatanRevisi: rejectModal.catatan });
            toast.success('Draft berhasil dikembalikan untuk revisi.');
            setRejectModal({ isOpen: false, id: null, type: null, catatan: '' });
            await refreshAfterAction();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Gagal memproses penolakan.');
        }
    }, [rejectModal, refreshAfterAction]);

    const handleApprovePersonel = useCallback(async (id) => {
        try {
            await api.post(`/personel/approve/${id}`);
            toast.success('Data personel telah disetujui.');
            await refreshAfterAction();
        } catch (error) {
            toast.error('Gagal menyetujui data.');
        }
    }, [refreshAfterAction]);

    const handleRejectPersonel = useCallback((id) => {
        setRejectModal({ isOpen: true, id, type: 'personel', catatan: '' });
    }, []);

    const handleEditPersonel = useCallback((personel) => {
        setSelectedPersonel(personel);
        setIsEditPersonel(true);
        setIsAddPersonelOpen(true);
    }, []);

    const triggerDeletePersonel = useCallback((id) => {
        setDeleteModal({ isOpen: true, id, alasan: '', statusKeaktifan: '' });
    }, []);

    const handlePersonelSuccess = useCallback((newPersonel) => {
        refreshAfterAction();
        if (!isEditPersonel && newPersonel) {
            setSelectedPersonelDetail(newPersonel);
        }
    }, [refreshAfterAction, isEditPersonel]);

    const confirmDeletePersonel = useCallback(async () => {
        try {
            await api.delete(`/personel/${deleteModal.id}`, {
                data: { alasan: deleteModal.alasan, statusKeaktifan: deleteModal.statusKeaktifan }
            });
            toast.success('Personel berhasil dinonaktifkan / dihapus dari sistem (soft delete).');
            setDeleteModal({ isOpen: false, id: null, alasan: '', statusKeaktifan: '' });
            await refreshAfterAction();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Terjadi kesalahan saat menghapus personel.');
        }
    }, [deleteModal, refreshAfterAction]);

    const triggerRestorePersonel = useCallback((id) => {
        setRestoreModal({ isOpen: true, id, alasan: '' });
    }, []);

    const confirmRestorePersonel = useCallback(async () => {
        try {
            await api.put(`/personel/restore/${restoreModal.id}`, { alasan: restoreModal.alasan });
            toast.success('Personel berhasil dipulihkan menjadi status Aktif.');
            setRestoreModal({ isOpen: false, id: null, alasan: '' });
            await refreshAfterAction();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Terjadi kesalahan saat memulihkan personel.');
        }
    }, [restoreModal, refreshAfterAction]);


    // Pagination Logic
    const totalPages = Math.ceil(modalList.length / itemsPerPage);
    const currentList = modalList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);



    return (
        <>
            <Toaster position="top-right" richColors />
            {loading && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'transparent',
                    zIndex: 9999,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '1rem',
                    pointerEvents: 'none',
                }}>
                    <Loading variant="inline" text="Memperbarui data ..." />
                </div>
            )}
            <div className="dashboard animate-fade-in">
                <div className="page-header mb-8 no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '2rem' }}>
                    <div style={{ flex: '1 1 auto', minWidth: '300px' }}>
                        <h1 className="page-title">
                            <LayoutDashboard size={32} />
                            Dashboard
                            <div className="live-indicator">
                                <span className="live-dot"></span>
                                Live Data
                            </div>
                        </h1>
                        <p className="page-subtitle">Ringkasan data {user?.role === 'ADMIN_POLDA' ? 'seluruh Satker Polda Jabar' : `Satker ${user?.satker?.nama} `}. Diperbarui secara otomatis.</p>
                    </div>

                    {/* Pencarian Global (Personel) */}
                    <div className="global-search-container" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flex: '0 1 400px', maxWidth: '400px' }}>
                        <div className="search-bar" style={{ flex: 1, padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', background: 'var(--surface-color)', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-premium)' }}>
                            <Search size={20} style={{ color: 'var(--text-muted)', marginRight: '0.75rem' }} />
                            <input
                                type="text"
                                placeholder="Pencarian Personel / Catpers (NRP, NIP, Nama)..."
                                value={globalSearch}
                                onChange={(e) => setGlobalSearch(e.target.value)}
                                onKeyDown={handleGlobalSearch}
                                style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.95rem', color: 'var(--text-main)' }}
                            />
                        </div>
                        <button className="btn-primary" onClick={() => handleGlobalSearch({ key: 'Enter' })} style={{ padding: '0.75rem 1.5rem', height: '100%', borderRadius: '12px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                            Cari
                        </button>
                    </div>
                </div>

                <div className="stats-grid no-print" style={{ marginBottom: '2rem' }}>
                    {/* 1. Total Personel */}
                    <StatCard title="Total Personel" value={stats?.totalPersonel || 0} icon={Users} colorClass="card-primary" onClick={() => handleOpenModal('Total Seluruh Personel', '')} />

                    {/* 2. Catpers Aktif */}
                    <StatCard title="Catpers Aktif" value={stats?.catpersAktif || 0} icon={AlertCircle} colorClass="card-danger" onClick={() => handleOpenModal('Personel Dengan Catatan Aktif', 'catpersAktif')} />

                    {/* 3. Pernah Tercatat */}
                    <StatCard title="Pernah Tercatat" value={stats?.pernahTercatat || 0} icon={History} colorClass="card-warning" onClick={() => handleOpenModal('Personel Pernah Tercatat', 'pernahTercatat')} />

                    {/* 4. Belum Rekomendasi */}
                    <StatCard title="Belum Rekomendasi" value={stats?.belumRekomendasi || 0} icon={Clock} colorClass="card-info" onClick={() => handleOpenModal('Belum Rekomendasi', 'belumRps')} />

                    {/* 5. Tidak Terbukti */}
                    <StatCard title="Tidak Terbukti" value={stats.tidakTerbukti || 0} icon={ShieldCheck} colorClass="card-success" onClick={() => handleOpenModal('Tidak Terbukti (Final)', 'tidakTerbukti')} />

                    {/* 6. Belum SKTT */}
                    <StatCard title="Belum Ada SKTT" value={stats.belumSktt || 0} icon={FileWarning} colorClass="card-warning" onClick={() => handleOpenModal('Belum Ada SKTT (Riksa)', 'belumSktt')} />

                    {/* 7. Belum SKTB */}
                    <StatCard title="Belum Ada SKTB" value={stats.belumSktb || 0} icon={FileWarning} colorClass="card-warning" onClick={() => handleOpenModal('Belum Ada SKTB (Sidang)', 'belumSktb')} />

                    {/* 8. Perdamaian */}
                    <StatCard title="Perdamaian" value={stats?.perdamaian || 0} icon={CheckCircle} colorClass="card-success" onClick={() => handleOpenModal('Personel Perdamaian', 'perdamaian')} />

                    {/* 9. Personel Tidak Aktif */}
                    <StatCard title="Personel Tidak Aktif" value={stats?.tidakAktif || 0} icon={UserMinus} colorClass="card-secondary" onClick={() => handleOpenModal('Personel Tidak Aktif / Pensiun', 'tidakAktif')} />

                    {/* 10. Draft Approval */}
                    <StatCard title="Draft Approval" value={stats.butuhApproval || 0} icon={Clock} colorClass="card-info" onClick={() => handleOpenModal('Menunggu Persetujuan Admin', 'DRAFT')} />
                </div>

                {user?.role === 'ADMIN_POLDA' && (
                    <div className="table-container mt-4 no-print">
                        <div className="card-header mb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3>Rekap Data Per Satker</h3>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Klik baris tabel untuk melihat rincian personel pada Kesatuan tersebut.</p>
                            </div>
                            <div className="search-bar" style={{ maxWidth: '300px', padding: '0.5rem 0.75rem' }}>
                                <Search size={16} style={{ color: 'var(--text-muted)', marginRight: '0.5rem' }} />
                                <input
                                    type="text"
                                    placeholder="Cari Satker..."
                                    value={satkerSearch}
                                    onChange={(e) => setSatkerSearch(e.target.value)}
                                    style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.9rem' }}
                                />
                            </div>
                        </div>
                        <div style={{ overflowX: 'auto', maxHeight: '500px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                            <table className="data-table" style={{ margin: 0, border: 'none' }}>
                                <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'white', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                                    <tr>
                                        <th onClick={() => requestSort('id')} style={{ cursor: 'pointer', whiteSpace: 'nowrap', width: '1%' }}>Satuan Kerja (Satker) {sortConfig.key === 'id' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                                        <th onClick={() => requestSort('totalPersonel')} style={{ textAlign: 'center', cursor: 'pointer', width: '16.5%' }}>Total {sortConfig.key === 'totalPersonel' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                                        <th onClick={() => requestSort('tidakAktif')} style={{ textAlign: 'center', cursor: 'pointer', width: '16.5%' }}>Tidak Aktif {sortConfig.key === 'tidakAktif' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                                        <th onClick={() => requestSort('catpersAktif')} style={{ textAlign: 'center', cursor: 'pointer', width: '16.5%' }}>Catpers Aktif {sortConfig.key === 'catpersAktif' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                                        <th onClick={() => requestSort('pernahTercatat')} style={{ textAlign: 'center', cursor: 'pointer', width: '16.5%' }}>Pernah Tercatat {sortConfig.key === 'pernahTercatat' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                                        <th onClick={() => requestSort('belumRekomendasi')} style={{ textAlign: 'center', cursor: 'pointer', width: '16.5%' }}>Belum Rekomendasi {sortConfig.key === 'belumRekomendasi' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                                        <th onClick={() => requestSort('butuhApproval')} style={{ textAlign: 'center', cursor: 'pointer', width: '16.5%' }}>Approval {sortConfig.key === 'butuhApproval' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedSatkerStats.length === 0 ? (
                                        <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>Data kesatuan tidak ditemukan</td></tr>
                                    ) : (
                                        sortedSatkerStats.map(s => (
                                            <tr key={s.id} className="hover-row">
                                                <td style={{ fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleOpenModal(`Semua Personel: ${s.nama} `, '', s.id)}>
                                                    <span style={{ color: 'var(--primary-color)' }}>{s.nama}</span>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    {renderBadge(s.totalPersonel, 'primary-color', s.totalPersonel > 0, () => handleOpenModal(`Semua Personel(${s.nama})`, '', s.id))}
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    {renderBadge(s.tidakAktif, 'secondary-color', s.tidakAktif > 0, () => handleOpenModal(`Personel Tidak Aktif(${s.nama})`, 'tidakAktif', s.id))}
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    {renderBadge(s.catpersAktif, 'danger', s.catpersAktif > 0, () => handleOpenModal(`Catatan Aktif(${s.nama})`, 'catpersAktif', s.id))}
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    {renderBadge(s.pernahTercatat, 'warning', s.pernahTercatat > 0, () => handleOpenModal(`Pernah Tercatat(${s.nama})`, 'pernahTercatat', s.id))}
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    {renderBadge(s.belumRekomendasi, 'info', s.belumRekomendasi > 0, () => handleOpenModal(`Belum Rekomendasi(${s.nama})`, 'belumRps', s.id))}
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    {renderBadge(s.butuhApproval, 'secondary-color', s.butuhApproval > 0, () => handleOpenModal(`Menunggu Approval(${s.nama})`, 'butuhApproval', s.id))}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            <Modal isOpen={modalData.isOpen && !selectedPersonelDetail} onClose={handleCloseModal} title={`Detail Data: ${modalData.title}`} maxWidth="80%">
                {/* VIEW DAFTAR PERSONEL */}
                <>
                    {/* LANDSCAPE PRINT STYLE FOR DASHBOARD ONLY */}
                    <style type="text/css" media="print">
                        {`
                        @page {
                            size: landscape !important;
                            margin: 10mm 20mm !important;
                        }
                        .only-print {
                            padding: 0 !important;
                        }
                        .modal-table-container.only-print {
                            display: block !important;
                            width: 100% !important;
                        }
                        `}
                    </style>

                    {/* Header khusus cetak yang hanya muncul di print preview */}
                    <div className="only-print" style={{ textAlign: 'center', lineHeight: '1.2', paddingBottom: '2.5cm' }}>
                        <h2 style={{ margin: 0, textTransform: 'uppercase' }}>Daftar Data Personel</h2>
                        <h3 style={{ margin: 0, color: '#444' }}>{modalData.title}</h3>
                        <p style={{ marginTop: '0.2rem', fontSize: '0.9rem', color: '#666' }}>Dicetak pada: {new Date().toLocaleString('id-ID')}</p>
                    </div>

                    <div className="only-print modal-table-container" style={{ width: '100%' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '15px', textAlign: 'left', tableLayout: 'auto' }}>
                            <thead>
                                <tr style={{ height: '30px', border: 'none' }}>
                                    <th colSpan="6" style={{ border: 'none' }}></th>
                                </tr>
                                <tr>
                                    <th style={{ border: '1px solid black', padding: '8px', textAlign: 'center', width: '40px' }}>No.</th>
                                    <th style={{ border: '1px solid black', padding: '8px', textAlign: 'center' }}>NRP / NIP</th>
                                    <th style={{ border: '1px solid black', padding: '8px', textAlign: 'center' }}>Nama Lengkap</th>
                                    <th style={{ border: '1px solid black', padding: '8px', textAlign: 'center' }}>Pangkat</th>
                                    <th style={{ border: '1px solid black', padding: '8px', textAlign: 'center' }}>Kesatuan</th>
                                    <th style={{ border: '1px solid black', padding: '8px', textAlign: 'center' }}>Status Personel</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedModalList.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" style={{ border: '1px solid black', padding: '12px', textAlign: 'center' }}>Tidak ada data</td>
                                    </tr>
                                ) : (
                                    sortedModalList.map((p, idx) => (
                                        <tr key={`print-${p.id}`}>
                                            <td style={{ border: '1px solid black', padding: '6px', textAlign: 'center' }}>{idx + 1}</td>
                                            <td style={{ border: '1px solid black', padding: '6px' }}>{p.nrpNip}</td>
                                            <td style={{ border: '1px solid black', padding: '6px' }}>{p.namaLengkap}</td>
                                            <td style={{ border: '1px solid black', padding: '6px' }}>{p.pangkat}</td>
                                            <td style={{ border: '1px solid black', padding: '6px' }}>{p.satker?.nama || '-'}</td>
                                            <td style={{ border: '1px solid black', padding: '6px' }}>
                                                {p.statusKeaktifan?.includes('PTDH') ? 'PTDH' : p.statusPersonel}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="page-actions mb-4 no-print" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <div className="search-bar" style={{ flex: 1, minWidth: '200px' }}>
                            <Search size={18} />
                            <input
                                type="text"
                                placeholder="Cari Nama atau NIP/NRP..."
                                value={modalSearch}
                                onChange={(e) => setModalSearch(e.target.value)}
                            />
                        </div>
                        <button className="btn-secondary" onClick={handlePrintModal} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Printer size={18} /> Cetak
                        </button>
                        <button className="btn-primary" onClick={handleExportExcel} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Download size={18} /> Ekspor CSV
                        </button>
                    </div>

                    {modalLoading ? (
                        <div className="loading-state py-8">
                            <Loading variant="inline" text="Mensinkronisasi Data..." />
                            <div style={{ marginTop: '1rem', width: '100%' }}>
                                <Loading variant="skeleton-list" />
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Batasan Tinggi Tabel List Mengikuti Dimensi Layar (Max Height & Overflow y) */}
                            <div className="modal-table-container" style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 22rem)' }}>
                                <table className="data-table" style={{ fontSize: '0.85em' }}>
                                    <thead>
                                        <tr>
                                            <th style={{ width: '40px', textAlign: 'center' }}>No.</th>
                                            <th onClick={() => requestPersonelSort('nrpNip')} style={{ cursor: 'pointer', textAlign: 'center' }}>NRP / NIP {personelSortConfig.key === 'nrpNip' ? (personelSortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                                            <th onClick={() => requestPersonelSort('namaLengkap')} style={{ cursor: 'pointer', textAlign: 'center' }}>Nama Lengkap {personelSortConfig.key === 'namaLengkap' ? (personelSortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                                            <th onClick={() => requestPersonelSort('pangkat')} style={{ cursor: 'pointer', textAlign: 'center' }}>Pangkat {personelSortConfig.key === 'pangkat' ? (personelSortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                                            <th onClick={() => requestPersonelSort('satker')} style={{ cursor: 'pointer', textAlign: 'center' }}>Kesatuan {personelSortConfig.key === 'satker' ? (personelSortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                                            <th onClick={() => requestPersonelSort('statusPersonel')} style={{ cursor: 'pointer', textAlign: 'center' }}>Status Personel {personelSortConfig.key === 'statusPersonel' ? (personelSortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                                            <th style={{ textAlign: 'center' }}>Aksi</th>
                                        </tr>
                                    </thead>
                                    {sortedModalList.length === 0 ? (
                                        <tbody>
                                            <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>Pencarian / Kategori tidak menghasilkan temuan.</td></tr>
                                        </tbody>
                                    ) : (
                                        <tbody>
                                            {sortedModalList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((p, index) => (
                                                <tr key={`screen-${p.id}`}>
                                                    <td style={{ textAlign: 'center' }}>{((currentPage - 1) * itemsPerPage) + index + 1}</td>
                                                    <td><span style={{ fontWeight: 600 }}>{p.nrpNip}</span></td>
                                                    <td>
                                                        {p.namaLengkap}
                                                        {p.isDraft && <span style={{ marginLeft: '8px', color: 'var(--danger)', fontWeight: 'bold', fontSize: '0.7em', border: '1px solid var(--danger)', padding: '1px 4px', borderRadius: '4px' }}>DRAFT</span>}
                                                        {p.hasDraftViolation && <span style={{ marginLeft: '8px', color: 'var(--warning)', fontWeight: 'bold', fontSize: '0.7em', border: '1px solid var(--warning)', padding: '1px 4px', borderRadius: '4px' }}>CATATAN DRAFT</span>}
                                                        {p.statusKeaktifan !== 'AKTIF' && (
                                                            <span style={{ marginLeft: '8px', color: 'var(--danger)', fontWeight: 'bold', fontSize: '0.7em', border: '1px solid var(--danger)', padding: '1px 4px', borderRadius: '4px', textTransform: 'uppercase' }}>
                                                                {p.statusKeaktifan?.replace('PTHD', 'PTDH')}
                                                            </span>
                                                        )}
                                                        {p.catatanRevisi && (
                                                            <div style={{ marginTop: '5px', padding: '5px 8px', background: '#fff5f5', borderLeft: '3px solid var(--danger)', fontSize: '0.75rem', color: 'var(--danger)', borderRadius: '4px' }}>
                                                                <strong>⚠️ Perlu Perbaikan:</strong> {p.catatanRevisi}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td>{p.pangkat}</td>
                                                    <td>{p.satker?.nama || '-'}</td>
                                                    <td>
                                                        <span style={{
                                                            padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
                                                            background: p.statusPersonel === 'Proses' ? 'var(--danger)' :
                                                                ['Pernah Tercatat', 'Belum SKTT', 'Belum SKTB', 'Belum Rekomendasi'].includes(p.statusPersonel) ? 'var(--warning)' :
                                                                    'var(--success)',
                                                            color: ['Bersih', 'Tidak Ada Catatan', 'Tidak Terbukti', 'Perdamaian'].includes(p.statusPersonel) ? 'white' : (['Pernah Tercatat', 'Belum SKTT', 'Belum SKTB', 'Belum Rekomendasi'].includes(p.statusPersonel) ? '#000' : 'white')
                                                        }}>
                                                            {p.statusKeaktifan?.includes('PTDH') ? 'PTDH' : p.statusPersonel}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: '4px' }}>
                                                            <button
                                                                className="btn-icon"
                                                                style={{ color: 'var(--info)' }}
                                                                onClick={() => setSelectedPersonelDetail(p)}
                                                                title="Lihat Histori Catpers"
                                                            >
                                                                <Eye size={18} />
                                                            </button>
                                                            {user?.role === 'ADMIN_POLDA' && p.isDraft && (
                                                                <>
                                                                    <button
                                                                        className="btn-icon"
                                                                        style={{ color: 'var(--success)' }}
                                                                        onClick={() => handleApprovePersonel(p.id)}
                                                                        title="Setujui Personel Baru"
                                                                    >
                                                                        <CheckCircle size={20} />
                                                                    </button>
                                                                    <button
                                                                        className="btn-icon"
                                                                        style={{ color: 'var(--danger)' }}
                                                                        onClick={() => handleRejectPersonel(p.id)}
                                                                        title="Tolak & Hapus Draft"
                                                                    >
                                                                        <XCircle size={20} />
                                                                    </button>
                                                                </>
                                                            )}
                                                            {(user?.role === 'ADMIN_POLDA') && !p.isDraft && (
                                                                <>
                                                                    <button
                                                                        className="btn-icon"
                                                                        style={{ opacity: p.statusKeaktifan !== 'AKTIF' ? 0.4 : 1 }}
                                                                        onClick={() => p.statusKeaktifan === 'AKTIF' && handleEditPersonel(p)}
                                                                        disabled={p.statusKeaktifan !== 'AKTIF'}
                                                                        title="Edit Data Dasar Personel"
                                                                    >
                                                                        <Edit2 size={18} />
                                                                    </button>
                                                                    <button
                                                                        className="btn-icon delete"
                                                                        style={{ opacity: p.statusKeaktifan !== 'AKTIF' ? 0.4 : 1 }}
                                                                        onClick={() => p.statusKeaktifan === 'AKTIF' && triggerDeletePersonel(p.id)}
                                                                        disabled={p.statusKeaktifan !== 'AKTIF'}
                                                                        title="Nonaktifkan / Hapus"
                                                                    >
                                                                        <Trash2 size={18} />
                                                                    </button>
                                                                </>
                                                            )}
                                                            {(user?.role === 'ADMIN_POLDA') && !p.isDraft && p.statusKeaktifan !== 'AKTIF' && (
                                                                <button
                                                                    className="btn-icon"
                                                                    style={{ color: 'var(--success)' }}
                                                                    onClick={() => triggerRestorePersonel(p.id)}
                                                                    title="Aktifkan Kembali Personel"
                                                                >
                                                                    <RefreshCw size={18} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    )}
                                </table>
                            </div>

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="flex justify-between items-center mt-4 pt-4 no-print" style={{ borderTop: '1px solid var(--border)', fontSize: '0.9rem' }}>
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
            </Modal>

            <PersonelFormModal
                isOpen={isAddPersonelOpen}
                onClose={() => { setIsAddPersonelOpen(false); setIsEditPersonel(false); setSelectedPersonel(null); }}
                onSuccess={handlePersonelSuccess}
                isEdit={isEditPersonel}
                initialData={selectedPersonel}
            />

            <PersonelHistoryModal
                isOpen={!!selectedPersonelDetail}
                onClose={handleCloseModal}
                personelId={selectedPersonelDetail?.id}
                onRefresh={() => {
                    fetchStats();
                    fetchModalList();
                }}
            />

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
                        <option value="PENSIUN">Pensiun</option>
                        <option value="TIDAK AKTIF (PTDH)">PTDH (Pemberhentian Tidak Dengan Hormat)</option>
                        <option value="DIHAPUS">Data Dihapus</option>
                    </select>
                </div>

                <div className="form-group w-full relative">
                    <label style={{ color: 'var(--danger)', fontWeight: 'bold' }}>Alasan Tindakan (Wajib Audit Log) *</label>
                    <textarea
                        className="form-input"
                        rows="3"
                        value={deleteModal.alasan}
                        onChange={(e) => setDeleteModal({ ...deleteModal, alasan: e.target.value })}
                        placeholder="Contoh: Kesalahan entri, Pegawai pensiun, PTDH, dsb..."
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

            {/* Modal Rejeksi / Revisi (Khusus Personel) */}
            <Modal isOpen={rejectModal.isOpen} onClose={() => setRejectModal({ isOpen: false, id: null, type: null, catatan: '' })} title="Kembalikan untuk Revisi">
                <div style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>
                    Berikan alasan atau instruksi perbaikan untuk operator Satker. Data tidak akan dihapus, namun akan ditandai butuh perbaikan.
                </div>
                <div className="form-group w-full relative">
                    <label style={{ fontWeight: 'bold' }}>Instruksi / Catatan Revisi *</label>
                    <textarea
                        className="form-input"
                        rows="4"
                        value={rejectModal.catatan}
                        onChange={(e) => setRejectModal({ ...rejectModal, catatan: e.target.value })}
                        placeholder="Contoh: Lampiran berkas kurang jelas, Tolong perbaiki pangkat, dsb..."
                        autoFocus
                    ></textarea>
                </div>
                <div className="form-actions mt-4">
                    <button type="button" className="btn-secondary" onClick={() => setRejectModal({ isOpen: false, id: null, type: null, catatan: '' })}>Batal</button>
                    <button type="button" onClick={confirmReject} className="btn-primary" style={{ background: 'var(--warning)', borderColor: 'var(--warning)', color: '#000' }}>
                        <XCircle size={16} /> Kirim Revisi
                    </button>
                </div>
            </Modal>

            {/* Modal Restore Personel */}
            <Modal isOpen={restoreModal.isOpen} onClose={() => setRestoreModal({ isOpen: false, id: null, alasan: '' })} title="Konfirmasi Pengaktifan Kembali">
                <div style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>
                    Tindakan ini akan mengembalikan personel dari status Tidak Aktif menjadi Aktif kembali. Sistem akan memulihkan NRP/NIP asli personel tersebut. Jika NRP/NIP sudah digunakan oleh personel lain, proses ini akan dibatalkan otomatis.
                </div>

                <div className="form-group w-full relative">
                    <label style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>Alasan Tindakan (Wajib Audit Log) *</label>
                    <textarea
                        className="form-input"
                        rows="3"
                        value={restoreModal.alasan}
                        onChange={(e) => setRestoreModal({ ...restoreModal, alasan: e.target.value })}
                        placeholder="Contoh: Kesalahan sistem, Mutasi dibatalkan, dsb..."
                        autoFocus
                    ></textarea>
                </div>
                <div className="form-actions mt-4">
                    <button type="button" className="btn-secondary" onClick={() => setRestoreModal({ isOpen: false, id: null, alasan: '' })}>Batal</button>
                    <button type="button" onClick={confirmRestorePersonel} className="btn-primary" disabled={!restoreModal.alasan.trim()}>
                        <RefreshCw size={16} /> Ya, Aktifkan
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
