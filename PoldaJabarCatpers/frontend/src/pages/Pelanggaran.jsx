import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Search, Plus, Edit2, Trash2, FileText, CheckCircle, FileWarning } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { format } from 'date-fns';
import api from '../utils/api';
import Modal from '../components/Modal';
import PelanggaranFormModal from '../components/PelanggaranFormModal';
import PersonelHistoryModal from '../components/PersonelHistoryModal';
import Loading from '../components/Loading';

const Pelanggaran = () => {
    const [personelList, setPersonelList] = useState([]);
    const [selectedPersonel, setSelectedPersonel] = useState(null);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const debounceRef = useRef(null);

    // Modal States
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [selectedPersonelId, setSelectedPersonelId] = useState(null);

    // Sorting State
    const [sortConfig, setSortConfig] = useState({ key: 'nrpNip', direction: 'asc' });

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Debounce search input — fetch hanya setelah user berhenti mengetik 400ms
    const handleSearchChange = useCallback((e) => {
        const val = e.target.value;
        setSearch(val);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setDebouncedSearch(val);
            setCurrentPage(1);
        }, 400);
    }, []);

    const fetchPersonel = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get(`/personel?search=${debouncedSearch}`);
            setPersonelList(res.data);
        } catch {
            toast.error('Gagal mengambil data dari server');
        } finally {
            setLoading(false);
        }
    }, [debouncedSearch]);

    const requestSort = useCallback((key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    }, []);

    // useMemo: kalkulasi hanya jika data/sort berubah
    const sortedPersonelList = useMemo(() => {
        return [...personelList].sort((a, b) => {
            let valA = sortConfig.key === 'count' ? (a._count?.pelanggaran || 0) : a[sortConfig.key];
            let valB = sortConfig.key === 'count' ? (b._count?.pelanggaran || 0) : b[sortConfig.key];
            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [personelList, sortConfig]);

    useEffect(() => {
        fetchPersonel();
    }, [fetchPersonel]); // fetchPersonel sudah di-memo dengan debouncedSearch sebagai dep

    const paginatedList = useMemo(() =>
        sortedPersonelList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
        [sortedPersonelList, currentPage]
    );

    const totalPages = useMemo(() =>
        Math.ceil(sortedPersonelList.length / itemsPerPage),
        [sortedPersonelList]
    );

    const handleSelectPersonel = useCallback((personelId) => {
        setSelectedPersonelId(personelId);
        setIsMenuOpen(true);
    }, []);

    const renderStatusBadge = (status) => {
        switch (status) {
            case 'MENJALANI_HUKUMAN': return <span style={{ color: 'var(--warning)', fontWeight: 600 }}>Menjalani Hukuman</span>;
            case 'TIDAK_TERBUKTI': return <span style={{ color: 'var(--success)', fontWeight: 600 }}>Tidak Terbukti</span>;
            case 'PERDAMAIAN': return <span style={{ color: 'var(--info)', fontWeight: 600 }}>Perdamaian</span>;
            default: return <span>-</span>;
        }
    };

    return (
        <div className="animate-fade-in">
            <Toaster position="top-right" richColors />

            <div className="page-header mb-4">
                <h1 className="page-title">
                    <FileWarning size={32} />
                    Catatan Pelanggaran
                    <div className="live-indicator">
                        <span className="live-dot"></span>
                        Internal Tracking
                    </div>
                </h1>
                <p className="page-subtitle">Daftar riwayat dan status indikasi pelanggaran personel Polda Jabar.</p>
            </div>

            {/* Search Bar & Actions */}
            <div className="page-actions">
                <div className="search-bar">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Cari Personel..."
                        value={search}
                        onChange={handleSearchChange}
                    />
                </div>
            </div>

            {/* Top Pagination Summary & Controls */}
            {totalPages > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(8px)', padding: '0.85rem 1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-premium)' }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileText size={16} />
                        Menampilkan <strong>{(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, sortedPersonelList.length)}</strong> dari <strong>{sortedPersonelList.length}</strong> personel terdaftar.
                    </div>
                    {totalPages > 1 && (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="btn-secondary"
                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', opacity: currentPage === 1 ? 0.5 : 1 }}
                            >
                                Sebelumnya
                            </button>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="btn-secondary"
                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', opacity: currentPage === totalPages ? 0.5 : 1 }}
                            >
                                Berikutnya
                            </button>
                        </div>
                    )}
                </div>
            )}

            {loading ? (
                <div className="loading-state" style={{ padding: '3rem', textAlign: 'center' }}>
                    <Loading variant="inline" text="Memuat data pelanggaran..." />
                </div>
            ) : (
                <div className="table-container">
                    {/* Header khusus cetak */}
                    <div className="only-print" style={{ marginBottom: '2rem', textAlign: 'center', borderBottom: '2px solid #333', paddingBottom: '1rem' }}>
                        <h2 style={{ textTransform: 'uppercase', margin: '0 0 0.5rem 0' }}>Data Catatan Pelanggaran Personel</h2>
                        <p style={{ margin: 0 }}>Dicetak pada: {new Date().toLocaleString('id-ID')}</p>
                    </div>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th onClick={() => requestSort('nrpNip')} style={{ cursor: 'pointer' }}>NRP / NIP {sortConfig.key === 'nrpNip' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                                <th onClick={() => requestSort('namaLengkap')} style={{ cursor: 'pointer' }}>Nama Lengkap {sortConfig.key === 'namaLengkap' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                                <th onClick={() => requestSort('pangkat')} style={{ cursor: 'pointer' }}>Pangkat / Jabatan {sortConfig.key === 'pangkat' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                                <th onClick={() => requestSort('count')} style={{ cursor: 'pointer' }}>Kasus Aktif & Riwayat {sortConfig.key === 'count' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                                <th className="no-print">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedList.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                        Tidak ditemukan data personel yang sesuai.
                                    </td>
                                </tr>
                            ) : (
                                paginatedList.map(p => (
                                    <tr key={p.id}>
                                        <td>
                                            <span style={{ fontWeight: 600 }}>{p.nrpNip}</span>
                                            {p.statusKeaktifan !== 'AKTIF' && (
                                                <div style={{ fontSize: '0.7rem', color: 'var(--danger)', fontWeight: 700, marginTop: '2px', textTransform: 'uppercase' }}>
                                                    {p.statusKeaktifan}
                                                </div>
                                            )}
                                        </td>
                                        <td>{p.namaLengkap}</td>
                                        <td>
                                            <div style={{ fontSize: '0.9rem' }}>{p.pangkat}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.jabatan}</div>
                                        </td>
                                        <td>
                                            <span style={{
                                                padding: '2px 8px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 600,
                                                background: p._count?.pelanggaran > 0 ? '#fee2e2' : '#dcfce7',
                                                color: p._count?.pelanggaran > 0 ? 'var(--danger)' : 'var(--success)'
                                            }}>
                                                {p._count?.pelanggaran || 0} Catatan
                                            </span>
                                        </td>
                                        <td className="no-print">
                                            <button
                                                className="btn-primary"
                                                style={{ 
                                                    padding: '0.4rem 0.8rem', 
                                                    fontSize: '0.85rem',
                                                    opacity: p.statusKeaktifan !== 'AKTIF' ? 0.5 : 1,
                                                    cursor: p.statusKeaktifan !== 'AKTIF' ? 'not-allowed' : 'pointer'
                                                }}
                                                onClick={() => handleSelectPersonel(p.id)}
                                                disabled={p.statusKeaktifan !== 'AKTIF'}
                                            >
                                                <FileText size={16} /> Lihat Catatan
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    {/* Bottom Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', padding: '1rem 0.5rem', borderTop: '1px solid var(--border-color)' }}>
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                Hal <strong>{currentPage}</strong> dari {totalPages}
                            </div>
                            <div style={{ display: 'flex', gap: '4px' }}>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        borderRadius: '6px',
                                        border: '1px solid var(--border-color)',
                                        background: 'white',
                                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                        opacity: currentPage === 1 ? 0.5 : 1,
                                        fontWeight: 600
                                    }}
                                >
                                    Sebelumnya
                                </button>
                                {[...Array(totalPages)].map((_, i) => {
                                    const pageNum = i + 1;
                                    if (
                                        pageNum === 1 ||
                                        pageNum === totalPages ||
                                        (pageNum >= currentPage - 2 && pageNum <= currentPage + 2)
                                    ) {
                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => setCurrentPage(pageNum)}
                                                style={{
                                                    width: '36px',
                                                    height: '36px',
                                                    borderRadius: '6px',
                                                    border: '1px solid',
                                                    borderColor: currentPage === pageNum ? 'var(--primary-color)' : 'var(--border-color)',
                                                    background: currentPage === pageNum ? 'var(--primary-color)' : 'white',
                                                    color: currentPage === pageNum ? 'white' : 'var(--text-color)',
                                                    cursor: 'pointer',
                                                    fontWeight: 600
                                                }}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    } else if (
                                        (pageNum === 2 && currentPage > 4) ||
                                        (pageNum === totalPages - 1 && currentPage < totalPages - 3)
                                    ) {
                                        return <span key={pageNum} style={{ padding: '0 4px' }}>...</span>;
                                    }
                                    return null;
                                })}
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        borderRadius: '6px',
                                        border: '1px solid var(--border-color)',
                                        background: 'white',
                                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                        opacity: currentPage === totalPages ? 0.5 : 1,
                                        fontWeight: 600
                                    }}
                                >
                                    Selanjutnya
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Unified History Modal */}
            <PersonelHistoryModal
                isOpen={isMenuOpen}
                onClose={() => setIsMenuOpen(false)}
                personelId={selectedPersonelId}
                onRefresh={fetchPersonel}
            />
        </div>
    );
};

export default Pelanggaran;
