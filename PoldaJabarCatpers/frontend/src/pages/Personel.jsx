import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Search, Plus, Edit2, Trash2 } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import api from '../utils/api';
import Modal from '../components/Modal';
import PersonelFormModal from '../components/PersonelFormModal';
import PelanggaranFormModal from '../components/PelanggaranFormModal';

const Personel = () => {
    const { user } = useAuth();
    const [personelList, setPersonelList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [selectedPersonel, setSelectedPersonel] = useState(null);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, alasan: '', statusKeaktifan: '' });
    const [isPelanggaranModalOpen, setIsPelanggaranModalOpen] = useState(false);

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

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

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


    return (
        <div className="animate-fade-in">
            <Toaster position="top-right" richColors />

            <div className="page-header mb-4">
                <h1 className="page-title">Manajemen Data Personel</h1>
                <p className="page-subtitle">Kelola data anggota Polri dan PNS yang terdaftar.</p>
            </div>

            <div className="page-actions">
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
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>NRP / NIP</th>
                                <th>Nama Lengkap</th>
                                <th>Pangkat</th>
                                <th>Jabatan</th>
                                <th>Kesatuan</th>
                                <th>Status Personel</th>
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {personelList.length === 0 ? (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>Belum ada data personel.</td>
                                </tr>
                            ) : (
                                personelList.map(p => (
                                    <tr key={p.id}>
                                        <td>
                                            <span style={{ fontWeight: 600 }}>{p.nrpNip}</span>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.jenisPegawai}</div>
                                        </td>
                                        <td>{p.namaLengkap}</td>
                                        <td>{p.pangkat}</td>
                                        <td>{p.jabatan}</td>
                                        <td>{p.satker?.nama || '-'}</td>
                                        <td>
                                            <span style={{
                                                padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600,
                                                background: p.statusPersonel === 'Ada Catatan' ? 'var(--danger)' : p.statusPersonel === 'Pernah Tercatat' ? 'var(--warning)' : 'var(--success)',
                                                color: 'white'
                                            }}>
                                                {p.statusPersonel}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="action-btns">
                                                {/* Edit hanya jika diperbolehkan */}
                                                {(user.role === 'ADMIN_POLDA' || p.satkerId === user.satkerId) && (
                                                    <>
                                                        <button
                                                            className="btn-primary"
                                                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', background: 'var(--danger)' }}
                                                            onClick={() => handleOpenPelanggaran(p)}
                                                            title="Tambah Catatan"
                                                        >
                                                            <Plus size={14} /> Catatan
                                                        </button>
                                                        <button className="btn-icon" onClick={() => handleOpenModal(p)} title="Edit"><Edit2 size={18} /></button>
                                                        <button className="btn-icon delete" onClick={() => triggerDelete(p.id)} title="Hapus"><Trash2 size={18} /></button>
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
            )}

            <PersonelFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchData}
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
        </div>
    );
};

export default Personel;
