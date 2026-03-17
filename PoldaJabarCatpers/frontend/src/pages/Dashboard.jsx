import React, { useState, useEffect, useMemo, useCallback, useRef, Suspense, lazy } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDashboard } from '../context/DashboardContext';
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
import { useDebounce } from '../hooks/useDebounce';
import { useModal } from '../hooks/useModal';

const PersonelFormModal = lazy(() => import('../components/PersonelFormModal'));
const PersonelHistoryModal = lazy(() => import('../components/PersonelHistoryModal'));
const DeleteConfirmModal = (props) => (
    <Modal {...props} title="Konfirmasi Nonaktif / Hapus Personel">
        <div style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>
            Tindakan ini akan mengarsipkan data ke basis *Tidak Aktif* dan membeberkan NRP/NIP untuk pendaftar baru.
        </div>
        <div className="form-group w-full relative" style={{ marginBottom: '1rem' }}>
            <label style={{ color: 'var(--danger)', fontWeight: 'bold' }}>Pilih Status Data *</label>
            <select
                className="form-input"
                value={props.statusKeaktifan}
                onChange={(e) => props.onChange({ statusKeaktifan: e.target.value })}
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
                value={props.alasan}
                onChange={(e) => props.onChange({ alasan: e.target.value })}
                placeholder="Contoh: Kesalahan entri, Pegawai pensiun, PTDH, dsb..."
                autoFocus
            ></textarea>
        </div>
        <div className="form-actions mt-4">
            <button type="button" className="btn-secondary" onClick={props.onClose}>Batal</button>
            <button type="button" onClick={props.onConfirm} className="btn-primary" style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }} disabled={!props.alasan?.trim() || !props.statusKeaktifan}>
                <Trash2 size={16} /> Ya, Proses
            </button>
        </div>
    </Modal>
);

// Lazy-load pdfGenerator hanya saat dibutuhkan
const getExportPersonelPDF = () => import('../utils/pdfGenerator').then(m => m.exportPersonelPDF);


const StatCard = ({ title, value, icon: Icon, colorClass, onClick, isLoading }) => {
    return (
        <div className={`stat-card ${colorClass} animate-card-fade`} onClick={onClick} title="Klik untuk melihat detail">
            <div className="stat-card-glow"></div>
            <div className="stat-card-content">
                <div className="stat-info">
                    {isLoading ? (
                        <div className="skeleton skeleton-bold" style={{ width: '60px', height: '32px', marginBottom: '8px', borderRadius: '8px' }}></div>
                    ) : (
                        <h3 className="stat-value">{value}</h3>
                    )}
                    <p className="stat-label">{title}</p>
                </div>
                <div className="stat-icon-outer">
                    <div className="stat-icon-inner">
                        <Icon size={22} className="stat-icon" />
                    </div>
                </div>
            </div>
            <div className="stat-card-progress">
                <div className="progress-bar-fill"></div>
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
    const { stats, satkerStatsList, loading, refresh: refreshDashboard, refreshPelanggaran } = useDashboard();
    const navigate = useNavigate();

    const [globalSearch, setGlobalSearch] = useState('');
    const [satkerSearch, setSatkerSearch] = useState('');

    // Sorting State
    const [sortConfig, setSortConfig] = useState({ key: 'urutan', direction: 'asc' });
    const [personelSortConfig, setPersonelSortConfig] = useState({ key: 'nrpNip', direction: 'asc' });

    // Centralized Modal Controller
    const { modalStack, openModal, closeModal, isAnyModalOpen } = useModal();

    // Persisted data for list modal (since we want to keep search state between sub-modal opens)
    const [listModalState, setListModalState] = useState({
        search: '',
        currentPage: 1,
        items: [],
        loading: false,
        title: '',
        category: '',
        satkerId: null
    });

    // Initial load
    useEffect(() => {
        refreshPelanggaran();
    }, [refreshPelanggaran]);

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

    const debouncedSatkerSearch = useDebounce(satkerSearch, 300);

    const filteredSatkerStats = useMemo(() =>
        satkerStatsList.filter(s => s.nama.toLowerCase().includes(debouncedSatkerSearch.toLowerCase())),
        [satkerStatsList, debouncedSatkerSearch]
    );

    const sortedSatkerStats = useMemo(() =>
        [...filteredSatkerStats].sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
            if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        }),
        [filteredSatkerStats, sortConfig]
    );

    const fetchModalList = useCallback(async (state) => {
        if (state.loading) return;
        setListModalState(prev => ({ ...prev, loading: true }));
        try {
            let url = `/personel?search=${encodeURIComponent(state.search)}`;
            if (state.category) url += `&category=${state.category}`;
            if (state.satkerId) url += `&satkerId=${state.satkerId}`;
            const res = await api.get(url);
            setListModalState(prev => ({ ...prev, items: res.data || [], loading: false }));
        } catch (error) {
            console.error('Gagal mengambil data list personel', error);
            toast.error("Gagal mengambil data personel");
            setListModalState(prev => ({ ...prev, loading: false }));
        }
    }, []);

    const handleOpenListModal = useCallback((title, category = '', satkerId = null, initialSearch = '') => {
        const initialState = {
            search: initialSearch,
            currentPage: 1,
            items: [],
            loading: false,
            title,
            category,
            satkerId
        };
        setListModalState(initialState);
        fetchModalList(initialState);
        openModal('LIST', { title });
    }, [openModal, fetchModalList]);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (modalStack.some(m => m.type === 'LIST')) {
                fetchModalList(listModalState);
            }
        }, 500);
        return () => clearTimeout(delayDebounceFn);
    }, [listModalState.search, listModalState.category, listModalState.satkerId]);

    const handleActionSuccess = useCallback(() => {
        refreshDashboard();
        fetchModalList(listModalState);
    }, [refreshDashboard, fetchModalList, listModalState]);

    const handleGlobalSearch = useCallback((e) => {
        if (e.key === 'Enter' && globalSearch.trim() !== '') {
            const searchTerm = globalSearch.trim();
            handleOpenListModal(`Pencarian: ${searchTerm}`, '', null, searchTerm);
            setGlobalSearch('');
        }
    }, [globalSearch, handleOpenListModal]);



    return (
        <>
            <Toaster position="top-right" richColors />
            <div className="dashboard animate-fade-in">
                <div className="page-header mb-8 no-print" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start', flexWrap: 'wrap', gap: '2rem' }}>
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
                    <StatCard title="Total Personel" value={stats?.totalPersonel || 0} icon={Users} colorClass="card-primary" onClick={() => handleOpenListModal('Total Seluruh Personel (Aktif)', 'aktif')} isLoading={loading} />
                    <StatCard title="Catpers Aktif" value={stats?.catpersAktif || 0} icon={AlertCircle} colorClass="card-danger" onClick={() => handleOpenListModal('Personel Dengan Catatan Aktif', 'catpersAktif')} isLoading={loading} />
                    <StatCard title="Pernah Tercatat" value={stats?.pernahTercatat || 0} icon={History} colorClass="card-warning" onClick={() => handleOpenListModal('Personel Pernah Tercatat', 'pernahTercatat')} isLoading={loading} />
                    <StatCard title="Belum Rekomendasi" value={stats?.belumRekomendasi || 0} icon={Clock} colorClass="card-info" onClick={() => handleOpenListModal('Belum Rekomendasi', 'belumRps')} isLoading={loading} />
                    <StatCard title="Tidak Terbukti" value={stats?.tidakTerbukti || 0} icon={ShieldCheck} colorClass="card-success" onClick={() => handleOpenListModal('Tidak Terbukti (Final)', 'tidakTerbukti')} isLoading={loading} />
                    <StatCard title="Belum Ada SKTT" value={stats?.belumSktt || 0} icon={FileWarning} colorClass="card-warning" onClick={() => handleOpenListModal('Belum Ada SKTT (Riksa)', 'belumSktt')} isLoading={loading} />
                    <StatCard title="Belum Ada SKTB" value={stats?.belumSktb || 0} icon={FileWarning} colorClass="card-warning" onClick={() => handleOpenListModal('Belum Ada SKTB (Sidang)', 'belumSktb')} isLoading={loading} />
                    <StatCard title="Perdamaian" value={stats?.perdamaian || 0} icon={CheckCircle} colorClass="card-success" onClick={() => handleOpenListModal('Personel Perdamaian', 'perdamaian')} isLoading={loading} />
                    <StatCard title="Personel Tidak Aktif" value={stats?.tidakAktif || 0} icon={UserMinus} colorClass="card-secondary" onClick={() => handleOpenListModal('Personel Tidak Aktif / Pensiun', 'tidakAktif')} isLoading={loading} />
                    <StatCard title="Draft Approval" value={stats?.butuhApproval || 0} icon={Clock} colorClass="card-info" onClick={() => handleOpenListModal('Menunggu Persetujuan Admin', 'DRAFT')} isLoading={loading} />
                </div>

                {user?.role === 'ADMIN_POLDA' && (
                    <div className="table-container mt-4 no-print">
                        <div className="card-header mb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3>Rekap Data Per Satker</h3>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Klik baris tabel untuk melihat rincian personel pada Kesatuan tersebut.</p>
                            </div>
                            <div className="global-search-container" style={{ maxWidth: '300px', width: '100%', display: 'flex', alignItems: 'center', padding: '0.6rem 1rem' }}>
                                <Search size={18} style={{ color: 'var(--brand)', marginRight: '0.75rem' }} />
                                <input
                                    type="text"
                                    placeholder="Cari Satuan Kerja..."
                                    value={satkerSearch}
                                    onChange={(e) => setSatkerSearch(e.target.value)}
                                    style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.95rem', fontWeight: '500' }}
                                />
                            </div>
                        </div>
                        <div style={{ overflowX: 'auto', maxHeight: '500px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                            <table className="data-table" style={{ margin: 0, border: 'none' }}>
                                <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'white', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                                    <tr>
                                        <th onClick={() => requestSort('nama')} style={{ cursor: 'pointer', whiteSpace: 'nowrap', width: '1%' }}>Satuan Kerja (Satker) {sortConfig.key === 'nama' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                                        <th onClick={() => requestSort('catpersAktif')} style={{ textAlign: 'center', cursor: 'pointer', width: '16.5%' }}>Catpers Aktif {sortConfig.key === 'catpersAktif' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                                        <th onClick={() => requestSort('pernahTercatat')} style={{ textAlign: 'center', cursor: 'pointer', width: '16.5%' }}>Pernah Tercatat {sortConfig.key === 'pernahTercatat' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                                        <th onClick={() => requestSort('belumRekomendasi')} style={{ textAlign: 'center', cursor: 'pointer', width: '16.5%' }}>Belum Rekomendasi {sortConfig.key === 'belumRekomendasi' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                                        <th onClick={() => requestSort('belumSktb')} style={{ textAlign: 'center', cursor: 'pointer', width: '16.5%' }}>Belum SKTB {sortConfig.key === 'belumSktb' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                                        <th onClick={() => requestSort('belumSktt')} style={{ textAlign: 'center', cursor: 'pointer', width: '16.5%' }}>Belum SKTT {sortConfig.key === 'belumSktt' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                                        <th onClick={() => requestSort('butuhApproval')} style={{ textAlign: 'center', cursor: 'pointer', width: '16.5%' }}>Approval {sortConfig.key === 'butuhApproval' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        Array.from({ length: 10 }).map((_, idx) => (
                                            <tr key={`skel-${idx}`}>
                                                <td><div className="skeleton" style={{ width: '70%', height: '20px', borderRadius: '4px' }}></div></td>
                                                {Array.from({ length: 6 }).map((_, i) => (
                                                    <td key={i}><div className="skeleton" style={{ width: '40px', height: '24px', margin: '0 auto', borderRadius: '12px' }}></div></td>
                                                ))}
                                            </tr>
                                        ))
                                    ) : (
                                        sortedSatkerStats.map(s => (
                                            <tr key={s.id} className="hover-row">
                                                <td style={{ fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleOpenListModal(`Semua Personel: ${s.nama} `, '', s.id)}>
                                                    <span style={{ color: 'var(--primary-color)' }}>{s.nama}</span>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    {renderBadge(s.catpersAktif, 'danger', s.catpersAktif > 0, () => handleOpenListModal(`Catatan Aktif(${s.nama})`, 'catpersAktif', s.id))}
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    {renderBadge(s.pernahTercatat, 'warning', s.pernahTercatat > 0, () => handleOpenListModal(`Pernah Tercatat(${s.nama})`, 'pernahTercatat', s.id))}
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    {renderBadge(s.belumRekomendasi, 'info', s.belumRekomendasi > 0, () => handleOpenListModal(`Belum Rekomendasi(${s.nama})`, 'belumRps', s.id))}
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    {renderBadge(s.belumSktb, 'warning', s.belumSktb > 0, () => handleOpenListModal(`Belum Ada SKTB(${s.nama})`, 'belumSktb', s.id))}
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    {renderBadge(s.belumSktt, 'warning', s.belumSktt > 0, () => handleOpenListModal(`Belum Ada SKTT(${s.nama})`, 'belumSktt', s.id))}
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    {renderBadge(s.butuhApproval, 'secondary-color', s.butuhApproval > 0, () => handleOpenListModal(`Menunggu Approval(${s.nama})`, 'butuhApproval', s.id))}
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

            {/* Centralized Modal Stack Renderer */}
            {modalStack.map((modal, index) => {
                const zIndex = 1100 + (index * 10);
                
                if (modal.type === 'LIST') {
                    const itemsPerPage = 8;
                    const totalPages = Math.ceil(listModalState.items.length / itemsPerPage);
                    const sortedItems = [...listModalState.items].sort((a, b) => {
                        let valA = personelSortConfig.key === 'satker' ? (a.satker?.nama || '') : a[personelSortConfig.key];
                        let valB = personelSortConfig.key === 'satker' ? (b.satker?.nama || '') : b[personelSortConfig.key];
                        if (valA < valB) return personelSortConfig.direction === 'asc' ? -1 : 1;
                        if (valA > valB) return personelSortConfig.direction === 'asc' ? 1 : -1;
                        return 0;
                    });
                    const currentList = sortedItems.slice((listModalState.currentPage - 1) * itemsPerPage, listModalState.currentPage * itemsPerPage);

                    return (
                        <Modal key={modal.id} isOpen={true} onClose={closeModal} title={`Detail Data: ${listModalState.title}`} maxWidth="80%" zIndex={zIndex}>
                            <div className="page-actions mb-4 no-print" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                <div className="search-bar">
                                    <Search size={18} />
                                    <input
                                        type="text"
                                        placeholder="Cari Nama atau NIP/NRP..."
                                        value={listModalState.search}
                                        onChange={(e) => setListModalState(prev => ({ ...prev, search: e.target.value, currentPage: 1 }))}
                                    />
                                </div>
                                <button className="btn-secondary" onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Printer size={18} /> Cetak
                                </button>
                            </div>

                            <div className="modal-table-container" style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '60vh' }}>
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
                                    <tbody>
                                        {listModalState.loading ? (
                                            Array.from({ length: 5 }).map((_, idx) => <tr key={idx}><td colSpan={7}><div className="skeleton" style={{ height: '30px' }}></div></td></tr>)
                                        ) : currentList.length === 0 ? (
                                            <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>Data tidak ditemukan.</td></tr>
                                        ) : (
                                            currentList.map((p, index) => (
                                                <tr key={p.id}>
                                                    <td style={{ textAlign: 'center' }}>{((listModalState.currentPage - 1) * itemsPerPage) + index + 1}</td>
                                                    <td style={{ fontWeight: 600 }}>{p.nrpNip}</td>
                                                    <td>{p.namaLengkap}</td>
                                                    <td>{p.pangkat}</td>
                                                    <td>{p.satker?.nama || '-'}</td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <span className={`badge badge-${p.statusKeaktifan === 'AKTIF' ? 'success' : 'danger'}`} style={{ fontSize: '0.75rem' }}>
                                                            {p.statusPersonel}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                                            <button className="btn-icon" onClick={() => openModal('HISTORY', { personel: p })} title="Lihat Histori"><Eye size={18} /></button>
                                                            {user?.role === 'ADMIN_POLDA' && (
                                                                <>
                                                                    <button className="btn-icon" onClick={() => openModal('FORM', { personel: p, isEdit: true })} title="Edit"><Edit2 size={18} /></button>
                                                                    <button className="btn-icon delete" onClick={() => openModal('DELETE', { id: p.id })} title="Hapus"><Trash2 size={18} /></button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {totalPages > 1 && (
                                <div className="flex justify-between items-center mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                                    <button className="btn-secondary" disabled={listModalState.currentPage === 1} onClick={() => setListModalState(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}>Prev</button>
                                    <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Halaman {listModalState.currentPage} dari {totalPages}</span>
                                    <button className="btn-secondary" disabled={listModalState.currentPage === totalPages} onClick={() => setListModalState(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}>Next</button>
                                </div>
                            )}
                        </Modal>
                    );
                }

                if (modal.type === 'FORM') {
                    return (
                        <Suspense key={modal.id} fallback={<Modal isOpen={true} title="Loading..." zIndex={zIndex}><div className="skeleton" style={{ height: '300px' }}></div></Modal>}>
                            <PersonelFormModal
                                isOpen={true}
                                onClose={closeModal}
                                onSuccess={handleActionSuccess}
                                isEdit={modal.props.isEdit}
                                initialData={modal.props.personel}
                                zIndex={zIndex}
                            />
                        </Suspense>
                    );
                }

                if (modal.type === 'HISTORY') {
                    return (
                        <Suspense key={modal.id} fallback={<Modal isOpen={true} title="Loading..." zIndex={zIndex}><div className="skeleton" style={{ height: '300px' }}></div></Modal>}>
                            <PersonelHistoryModal
                                isOpen={true}
                                onClose={closeModal}
                                personelId={modal.props.personel.id}
                                initialData={modal.props.personel}
                                onRefresh={handleActionSuccess}
                                zIndex={zIndex}
                            />
                        </Suspense>
                    );
                }

                if (modal.type === 'DELETE') {
                    return (
                        <DeleteConfirmModal 
                            key={modal.id}
                            isOpen={true}
                            onClose={closeModal}
                            zIndex={zIndex}
                            alasan={modal.props.alasan || ''}
                            statusKeaktifan={modal.props.statusKeaktifan || ''}
                            onChange={(updates) => {
                                modal.props = { ...modal.props, ...updates };
                                setListModalState(prev => ({ ...prev })); 
                            }}
                            onConfirm={async () => {
                                if (!modal.props.alasan?.trim() || !modal.props.statusKeaktifan) {
                                    toast.error("Alasan dan Status wajib diisi");
                                    return;
                                }
                                try {
                                    await api.delete(`/personel/${modal.props.id}`, {
                                        data: { alasan: modal.props.alasan, statusKeaktifan: modal.props.statusKeaktifan }
                                    });
                                    toast.success('Berhasil dinonaktifkan.');
                                    closeModal();
                                    handleActionSuccess();
                                } catch (e) { 
                                    toast.error(e.response?.data?.message || 'Gagal menghapus personel'); 
                                }
                            }}
                        />
                    );
                }

                return null;
            })}

            <button
                className="floating-add-btn"
                onClick={() => openModal('FORM', { isEdit: false })}
                title="Tambah Personel Baru"
            >
                <Plus size={28} />
            </button>
        </>
    );
};

export default Dashboard;
