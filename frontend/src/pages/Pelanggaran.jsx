import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, FileText, CheckCircle, FileWarning } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import api from '../utils/api';
import Modal from '../components/Modal';
import PelanggaranFormModal from '../components/PelanggaranFormModal';
import PersonelHistoryModal from '../components/PersonelHistoryModal';

const Pelanggaran = () => {
    const [personelList, setPersonelList] = useState([]);
    const { pelanggaranList, refreshPelanggaran } = useDashboard();
    const [selectedPersonel, setSelectedPersonel] = useState(null);
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    // Modal States
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [selectedPersonelId, setSelectedPersonelId] = useState(null);

    // Sorting State
    const [sortConfig, setSortConfig] = useState({ key: 'nrpNip', direction: 'asc' });

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const fetchPersonel = async () => {
        // Jika pencarian kosong dan kita punya data di context, gunakan itu
        if (!search && pelanggaranList && pelanggaranList.length > 0) {
            setPersonelList(pelanggaranList);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const res = await api.get(`/personel?search=${search}`);
            setPersonelList(res.data);

            // Jika pencarian kosong, update juga context agar tetap sinkron
            if (!search) {
                // Catatan: refreshPelanggaran() akan fetch ulang, tapi kita bisa update state lokal context jika mau
                // Untuk kesederhanaan, kita biarkan context diupdate via refreshPelanggaran jika perlu
            }
        } catch {
            toast.error('Gagal mengambil data dari server');
        } finally {
            setLoading(false);
        }
    };

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedPersonelList = [...personelList].sort((a, b) => {
        let valA, valB;
        if (sortConfig.key === 'count') {
            valA = a._count?.pelanggaran || 0;
            valB = b._count?.pelanggaran || 0;
        } else {
            valA = a[sortConfig.key];
            valB = b[sortConfig.key];
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    // Removed auto-fetch useEffect that tracked 'search'
    // Search is now triggered manually via handleSearch
    useEffect(() => {
        fetchPersonel();
        setCurrentPage(1);
    }, [search]); // Kept dependency on 'search' but it only changes on manual submit

    const handleSearchClick = () => {
        setSearch(searchInput);
    };

    const paginatedList = sortedPersonelList.slice(
        0,
        currentPage * itemsPerPage
    );

    const totalPages = Math.ceil(sortedPersonelList.length / itemsPerPage);

    const handleSelectPersonel = (personelId) => {
        setSelectedPersonelId(personelId);
        setIsMenuOpen(true);
    };

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



            {/* Search Bar & Actions */}
            <div className="page-actions" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
                <div className="search-bar" style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Cari Personel..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSearchClick();
                        }}
                    />
                    <button className="btn-primary" onClick={handleSearchClick} style={{ marginLeft: '8px', padding: '0.4rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}>
                        Cari
                    </button>
                </div>
            </div>


            {loading ? <div className="loading-state">Memuat Data...</div> : (
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

                    {/* Bottom Load More for Lazy Load */}
                    {currentPage < totalPages && (
                        <div className="no-print" style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem', padding: '1rem 0.5rem' }}>
                            <button
                                onClick={() => setCurrentPage(prev => prev + 1)}
                                className="btn-secondary"
                                style={{
                                    padding: '0.75rem 2rem',
                                    borderRadius: '12px',
                                    border: '1px solid var(--border-color)',
                                    background: 'var(--surface-color)',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    boxShadow: 'var(--shadow-sm)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                <Plus size={18} /> Muat Lebih Banyak (Lazy Load)
                            </button>
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
