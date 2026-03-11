import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Search, Plus, Edit2, Trash2, Users, RefreshCw } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import api from '../utils/api';
import Modal from '../components/Modal';
import PersonelFormModal from '../components/PersonelFormModal';
import PelanggaranFormModal from '../components/PelanggaranFormModal';
import PersonelHistoryModal from '../components/PersonelHistoryModal';

const Personel = () => {
    const { user } = useAuth();
    const [personelList, setPersonelList] = useState([]);
    const [loading, setLoading] = useState(true);
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
        setCurrentPage(1); // Reset to first page on search
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

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
            // Mengirim payload 'alasan' & 'statusKeaktifan' melalui parameter { data: ... }
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
            <Toaster position="top-right" richColors />

            <div className="page-header mb-4">
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

            <div className="page-actions no-print">
                <div className="search-bar">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Cari Nama atau NRP / NIP..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <button className="btn-primary" onClick={() => handleOpenModal()}>
                    <Plus size={18} /> Tambah Personel
                </button>
            </div>

            {loading ? (
                <div className="loading-state">Memuat Data...</div>
            ) : (
                <>
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
                                    <th onClick={() => requestSort('nrpNip')} style={{ cursor: 'pointer' }}>NRP / NIP <span className="no-print">{sortConfig.key === 'nrpNip' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</span></th>
                                    <th onClick={() => requestSort('namaLengkap')} style={{ cursor: 'pointer' }}>Nama Lengkap <span className="no-print">{sortConfig.key === 'namaLengkap' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</span></th>
                                    <th onClick={() => requestSort('pangkat')} style={{ cursor: 'pointer' }}>Pangkat <span className="no-print">{sortConfig.key === 'pangkat' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</span></th>
                                    <th onClick={() => requestSort('jabatan')} style={{ cursor: 'pointer' }}>Jabatan <span className="no-print">{sortConfig.key === 'jabatan' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</span></th>
                                    <th onClick={() => requestSort('satker')} style={{ cursor: 'pointer' }}>Kesatuan <span className="no-print">{sortConfig.key === 'satker' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</span></th>
                                    <th onClick={() => requestSort('statusPersonel')} style={{ cursor: 'pointer' }}>Status Personel <span className="no-print">{sortConfig.key === 'statusPersonel' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</span></th>
                                    <th className="no-print">Aksi</th>
                                </tr>
                            </thead>
                            {sortedPersonelList.length === 0 ? (
                                <tbody>
                                    <tr>
                                        <td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>Belum ada data personel.</td>
                                    </tr>
                                </tbody>
                            ) : (
                                <>
                                    {/* SCREEN VIEW: Paginated */}
                                    <tbody className="no-print">
                                        {paginatedList.map((p, index) => (
                                            <tr key={`screen-${p.id}`}>
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
                                                    <span className="no-print" style={{
                                                        padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600,
                                                        background: p.statusPersonel === 'Ada Catatan' ? 'var(--danger)' : p.statusPersonel === 'Pernah Tercatat' ? 'var(--warning)' : 'var(--success)',
                                                        color: 'white'
                                                    }}>
                                                        {p.statusPersonel}
                                                    </span>
                                                    <span className="only-print">
                                                        {p.statusPersonel}
                                                    </span>
                                                </td>
                                                <td className="no-print">
                                                    <div className="action-btns">
                                                        {(user.role === 'ADMIN_POLDA' || Number(p.satkerId) === Number(user?.satker?.id || user?.satkerId)) && (
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
                                                                <button className="btn-icon" style={{ opacity: p.statusKeaktifan !== 'AKTIF' ? 0.4 : 1 }} onClick={() => p.statusKeaktifan === 'AKTIF' && handleOpenModal(p)} disabled={p.statusKeaktifan !== 'AKTIF'} title="Edit"><Edit2 size={18} /></button>
                                                                <button className="btn-icon delete" style={{ opacity: p.statusKeaktifan !== 'AKTIF' ? 0.4 : 1 }} onClick={() => p.statusKeaktifan === 'AKTIF' && triggerDelete(p.id)} disabled={p.statusKeaktifan !== 'AKTIF'} title="Hapus"><Trash2 size={18} /></button>
                                                                {p.statusKeaktifan !== 'AKTIF' && (
                                                                    <button className="btn-icon" style={{ color: 'var(--success)' }} onClick={() => triggerRestorePersonel(p.id)} title="Aktifkan Kembali Personel"><RefreshCw size={18} /></button>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>

                                    {/* PRINT VIEW: Full List */}
                                    <tbody className="only-print">
                                        {sortedPersonelList.map((p, idx) => (
                                            <tr key={`print-${p.id}`}>
                                                <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                                                <td>{p.nrpNip}</td>
                                                <td>{p.namaLengkap}</td>
                                                <td>{p.pangkat}</td>
                                                <td>{p.jabatan}</td>
                                                <td>{p.satker?.nama || '-'}</td>
                                                <td>{p.statusPersonel}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </>
                            )}
                        </table>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', padding: '0 0.5rem' }}>
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                    Menampilkan {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, sortedPersonelList.length)} dari {sortedPersonelList.length} personel
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
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
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        {[...Array(totalPages)].map((_, i) => {
                                            const pageNum = i + 1;
                                            if (
                                                pageNum === 1 ||
                                                pageNum === totalPages ||
                                                (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
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
                                                (pageNum === 2 && currentPage > 3) ||
                                                (pageNum === totalPages - 1 && currentPage < totalPages - 2)
                                            ) {
                                                return <span key={pageNum} style={{ padding: '0 4px' }}>...</span>;
                                            }
                                            return null;
                                        })}
                                    </div>
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
                </>
            )}

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
                        <option value="PENSIUN">Pensiun DIni / Mutasi Keluar</option>
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
        </div>
    );
};

export default Personel;
