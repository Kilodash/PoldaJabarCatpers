import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Search, Plus, Edit2, Trash2, Users, RefreshCw, Eye } from 'lucide-react';
import { toast } from 'sonner';
import api from '../utils/api';
import Modal from '../components/Modal';
import PersonelFormModal from '../components/PersonelFormModal';
import PelanggaranFormModal from '../components/PelanggaranFormModal';
import PersonelHistoryModal from '../components/PersonelHistoryModal';
import Loading from '../components/Loading';

const Personel = () => {
    const { user } = useAuth();
    const [personelList, setPersonelList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [selectedPersonel, setSelectedPersonel] = useState(null);
    const [selectedPersonelDetail, setSelectedPersonelDetail] = useState(null);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, alasan: '', statusKeaktifan: '' });
    const [restoreModal, setRestoreModal] = useState({ isOpen: false, id: null, alasan: '' });
    const [isPelanggaranModalOpen, setIsPelanggaranModalOpen] = useState(false);

    // Sorting State
    const [sortConfig, setSortConfig] = useState({ key: 'nrpNip', direction: 'asc' });

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const fetchData = async () => {
        try {
            setLoading(true);
            const resPersonel = await api.get(`/personel?search=${search}`);
            setPersonelList(resPersonel.data);
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
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];

        // Handle nested satker name
        if (sortConfig.key === 'satker') {
            valA = a.satker?.nama || '';
            valB = b.satker?.nama || '';
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    useEffect(() => {
        fetchData();
        setCurrentPage(1);
    }, [search]);

    const handleSearchClick = () => {
        setSearch(searchInput);
    };

    const paginatedList = sortedPersonelList.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const totalPages = Math.ceil(sortedPersonelList.length / itemsPerPage);

    const handleOpenModal = (personel = null) => {
        if (personel) {
            setIsEdit(true);
            setSelectedPersonel(personel);
        } else {
            setIsEdit(false);
            setSelectedPersonel(null);
        }
        setIsModalOpen(true);
    };

    const handleOpenPelanggaran = (personel) => {
        setSelectedPersonel(personel);
        setIsPelanggaranModalOpen(true);
    };

    const triggerDelete = (id) => {
        setDeleteModal({ isOpen: true, id, alasan: '', statusKeaktifan: '' });
    };

    const handlePersonelSuccess = (newPersonel) => {
        fetchData();
        if (!isEdit && newPersonel) {
            setSelectedPersonelDetail(newPersonel);
        }
    };

    const confirmDelete = async () => {
        if (!deleteModal.alasan || deleteModal.alasan.trim() === '') {
            toast.error('Alasan wajib diisi demi kebijakan Audit Log.');
            return;
        }

        if (!deleteModal.statusKeaktifan) {
            toast.error('Silakan pilih Kategori Status Keaktifan terlebih dahulu.');
            return;
        }

        try {
            await api.delete(`/personel/${deleteModal.id}`, { data: { alasan: deleteModal.alasan, statusKeaktifan: deleteModal.statusKeaktifan } });
            toast.success('Data Personel berhasil dinonaktifkan / dihapus');
            setDeleteModal({ isOpen: false, id: null, alasan: '', statusKeaktifan: '' });
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Gagal menghapus data');
        }
    };

    const triggerRestorePersonel = (id) => {
        setRestoreModal({ isOpen: true, id, alasan: '' });
    };

    const confirmRestorePersonel = async () => {
        try {
            await api.put(`/personel/restore/${restoreModal.id}`, {
                alasan: restoreModal.alasan
            });
            toast.success('Personel berhasil dipulihkan menjadi status Aktif.');
            setRestoreModal({ isOpen: false, id: null, alasan: '' });
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Terjadi kesalahan saat memulihkan personel.');
        }
    };

    return (
        <div className="animate-fade-in">
            <div className="page-header mb-4 no-print">
                <h1 className="page-title">
                    <Users size={32} />
                    Manajemen Data Personel
                    <div className="live-indicator">
                        <span className="live-dot"></span>
                        Real-time
                    </div>
                </h1>
                <p className="page-subtitle">Kelola data anggota Polri dan PNS yang terdaftar di sistem CDS Polda Jabar.</p>
            </div>

            <div className="only-print" style={{ marginBottom: '2rem', textAlign: 'center', borderBottom: '2px solid #333', paddingBottom: '1rem' }}>
                <h2 style={{ textTransform: 'uppercase', margin: '0 0 0.5rem 0' }}>Daftar Data Personel CDS Polda Jabar</h2>
                <p style={{ margin: 0 }}>Dicetak pada: {new Date().toLocaleString('id-ID')}</p>
            </div>

            <div className="page-actions no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', alignItems: 'center' }}>
                <div className="search-bar" style={{ display: 'flex', alignItems: 'center', margin: 0 }}>
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Cari Nama atau NRP / NIP..."
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

                <button className="btn-primary" onClick={() => handleOpenModal()}>
                    <Plus size={18} /> Tambah Personel
                </button>
            </div>

            {loading ? (
                <div className="loading-state py-8">
                    <Loading variant="inline" text="Sinkronisasi Database..." />
                    <div style={{ marginTop: '1.5rem', width: '100%' }}>
                        <Loading variant="skeleton-list" />
                    </div>
                </div>
            ) : (
                <>
                    <div className="no-print">
                        {/* Top Pagination Summary */}
                        {sortedPersonelList.length > 0 && (
                            <div style={{ marginBottom: '1.25rem', background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(8px)', padding: '0.85rem 1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)', fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: 'var(--shadow-premium)' }}>
                                <RefreshCw size={16} className="animate-spin-slow" />
                                Menampilkan <strong>{(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, sortedPersonelList.length)}</strong> dari <strong>{sortedPersonelList.length}</strong> personel terdaftar.
                            </div>
                        )}
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '40px' }}>No.</th>
                                        <th onClick={() => requestSort('nrpNip')} style={{ cursor: 'pointer' }}>NRP / NIP {sortConfig.key === 'nrpNip' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                                        <th onClick={() => requestSort('namaLengkap')} style={{ cursor: 'pointer' }}>Nama Lengkap {sortConfig.key === 'namaLengkap' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                                        <th onClick={() => requestSort('pangkat')} style={{ cursor: 'pointer' }}>Pangkat {sortConfig.key === 'pangkat' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                                        <th onClick={() => requestSort('jabatan')} style={{ cursor: 'pointer' }}>Jabatan {sortConfig.key === 'jabatan' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                                        <th onClick={() => requestSort('satker')} style={{ cursor: 'pointer' }}>Kesatuan {sortConfig.key === 'satker' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                                        <th onClick={() => requestSort('statusPersonel')} style={{ cursor: 'pointer' }}>Status {sortConfig.key === 'statusPersonel' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                                        <th>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedList.length === 0 ? (
                                        <tr>
                                            <td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>Belum ada data personel.</td>
                                        </tr>
                                    ) : (
                                        paginatedList.map((p, index) => (
                                            <tr key={p.id}>
                                                <td style={{ textAlign: 'center' }}>{((currentPage - 1) * itemsPerPage) + index + 1}</td>
                                                <td>
                                                    <span style={{ fontWeight: 600 }}>{p.nrpNip}</span>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.jenisPegawai}</div>
                                                </td>
                                                <td>{p.namaLengkap}</td>
                                                <td>{p.pangkat}</td>
                                                <td>{p.jabatan}</td>
                                                <td>{p.satker?.nama || '-'}</td>
                                                <td>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                                                        <span style={{
                                                            padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600,
                                                            background: p.statusPersonel === 'Ada Catatan' ? 'var(--danger)' : p.statusPersonel === 'Pernah Tercatat' ? 'var(--warning)' : 'var(--success)',
                                                            color: 'white'
                                                        }}>
                                                            {p.statusPersonel}
                                                        </span>
                                                        {p.statusKeaktifan !== 'AKTIF' && (
                                                            <span className="badge badge-secondary" style={{ fontSize: '0.70rem', background: '#e2e8f0', color: '#475569', padding: '0.2rem 0.5rem' }}>
                                                                {p.statusKeaktifan.replace(/_/g, ' ')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="action-btns">
                                                        <button
                                                            className="btn-icon"
                                                            onClick={() => setSelectedPersonelDetail(p)}
                                                            title="Lihat Histori"
                                                        >
                                                            <Eye size={18} />
                                                        </button>
                                                        {(user.role === 'ADMIN_POLDA' || Number(p.satkerId) === Number(user?.satker?.id || user?.satkerId)) && p.statusKeaktifan === 'AKTIF' && (
                                                            <button
                                                                className="btn-primary"
                                                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', background: 'var(--danger)' }}
                                                                onClick={() => handleOpenPelanggaran(p)}
                                                                title="Tambah Catatan"
                                                            >
                                                                <Plus size={14} /> Catatan
                                                            </button>
                                                        )}
                                                        {user.role === 'ADMIN_POLDA' && (
                                                            <>
                                                                {p.statusKeaktifan === 'AKTIF' && (
                                                                    <>
                                                                        <button className="btn-icon" onClick={() => handleOpenModal(p)} title="Edit"><Edit2 size={18} /></button>
                                                                        <button className="btn-icon delete" onClick={() => triggerDelete(p.id)} title="Hapus"><Trash2 size={18} /></button>
                                                                    </>
                                                                )}
                                                                {p.statusKeaktifan !== 'AKTIF' && (
                                                                    <button className="btn-icon" style={{ color: 'var(--success)' }} onClick={() => triggerRestorePersonel(p.id)} title="Aktifkan Kembali Personel"><RefreshCw size={18} /></button>
                                                                )}
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

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2.5rem', padding: '0 0.5rem' }}>
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                    Menampilkan {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, sortedPersonelList.length)} dari {sortedPersonelList.length} personel
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="btn-secondary"
                                        style={{ padding: '0.5rem 1rem', opacity: currentPage === 1 ? 0.5 : 1, fontWeight: 600 }}
                                    >
                                        Sebelumnya
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                        className="btn-secondary"
                                        style={{ padding: '0.5rem 1rem', opacity: currentPage === totalPages ? 0.5 : 1, fontWeight: 600 }}
                                    >
                                        Selanjutnya
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* PRINT VIEW: Structured Blocks */}
                    <div className="only-print" style={{ color: '#000', fontFamily: 'monospace' }}>
                        {sortedPersonelList.map((p, idx) => (
                            <div key={`print-text-${p.id}`} style={{ marginBottom: '2.5rem', padding: '1.5rem', border: '1px solid #333', borderRadius: '4px', pageBreakInside: 'avoid' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '11pt', borderBottom: '1px solid #333', marginBottom: '1rem', paddingBottom: '0.5rem', textAlign: 'center' }}>
                                    DATA PERSONEL #{idx + 1}
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '180px 20px 1fr', gap: '8px', fontSize: '10pt', lineHeight: '1.6' }}>
                                    <span style={{ fontWeight: 'bold' }}>NRP / NIP</span> <span>:</span> <span>{p.nrpNip}</span>
                                    <span style={{ fontWeight: 'bold' }}>NAMA LENGKAP</span> <span>:</span> <span style={{ textTransform: 'uppercase' }}>{p.namaLengkap}</span>
                                    <span style={{ fontWeight: 'bold' }}>PANGKAT / GOL</span> <span>:</span> <span>{p.pangkat}</span>
                                    <span style={{ fontWeight: 'bold' }}>JABATAN</span> <span>:</span> <span>{p.jabatan}</span>
                                    <span style={{ fontWeight: 'bold' }}>KESATUAN (SATKER)</span> <span>:</span> <span>{p.satker?.nama || '-'}</span>
                                    <span style={{ fontWeight: 'bold' }}>JENIS PEGAWAI</span> <span>:</span> <span>{p.jenisPegawai}</span>
                                    <span style={{ fontWeight: 'bold' }}>STATUS PERSONEL</span> <span>:</span> <span>{p.statusPersonel} {p.statusKeaktifan !== 'AKTIF' ? `(${p.statusKeaktifan.replace(/_/g, ' ')})` : ''}</span>
                                </div>
                            </div>
                        ))}
                        {sortedPersonelList.length === 0 && <p style={{ textAlign: 'center' }}>Tidak ada data personel untuk dicetak.</p>}
                    </div>

                    <PersonelFormModal
                        isOpen={isModalOpen}
                        onClose={() => setIsModalOpen(false)}
                        onSuccess={handlePersonelSuccess}
                        isEdit={isEdit}
                        initialData={selectedPersonel}
                    />

                    <PelanggaranFormModal
                        isOpen={isPelanggaranModalOpen}
                        onClose={() => setIsPelanggaranModalOpen(false)}
                        onSuccess={fetchData}
                        isEdit={false}
                        initialData={null}
                        targetPersonel={selectedPersonel}
                    />

                    <PersonelHistoryModal
                        isOpen={!!selectedPersonelDetail}
                        onClose={() => setSelectedPersonelDetail(null)}
                        personelId={selectedPersonelDetail?.id}
                        onRefresh={fetchData}
                    />

                    {/* Modal Penghapusan (Audit Log / Soft Delete / Nonaktif) */}
                    <Modal isOpen={deleteModal.isOpen} onClose={() => setDeleteModal({ isOpen: false, id: null, alasan: '', statusKeaktifan: '' })} title="Konfirmasi Nonaktif / Hapus">
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
                                <option value="">-- Pilih --</option>
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
                            <button type="button" onClick={confirmDelete} className="btn-primary" style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }} disabled={!deleteModal.alasan.trim() || !deleteModal.statusKeaktifan}>
                                <Trash2 size={16} /> Ya, Proses
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
                </>
            )}
        </div>
    );
};

export default Personel;
