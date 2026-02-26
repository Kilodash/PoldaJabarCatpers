import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, FileText, CheckCircle } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { format } from 'date-fns';
import api from '../utils/api';
import Modal from '../components/Modal';
import PelanggaranFormModal from '../components/PelanggaranFormModal';

const Pelanggaran = () => {
    const [personelList, setPersonelList] = useState([]);
    const [selectedPersonel, setSelectedPersonel] = useState(null);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    // Modal States
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [editData, setEditData] = useState(null);

    const fetchPersonel = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/personel?search=${search}`);
            setPersonelList(res.data);
        } catch {
            toast.error('Gagal mengambil data dari server');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPersonel();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const handleSelectPersonel = async (personelId) => {
        try {
            const res = await api.get(`/personel/${personelId}`);
            setSelectedPersonel(res.data);
            setIsMenuOpen(true);
        } catch {
            toast.error('Gagal memuat detail personel');
        }
    };

    const handleOpenAdd = () => {
        setEditData(null);
        setIsFormModalOpen(true);
    };

    const handleOpenEdit = (pel) => {
        setEditData(pel);
        setIsFormModalOpen(true);
    };

    const handleFormSuccess = () => {
        // Refresh data personel yg sedang dibuka & list keseluruhan
        handleSelectPersonel(selectedPersonel.id);
        fetchPersonel();
    };

    const handleDelete = async (id) => {
        if (window.confirm('Hapus catatan pelanggaran ini secara permanen?')) {
            try {
                await api.delete(`/pelanggaran/${id}`);
                toast.success('Berhasil dihapus');
                handleSelectPersonel(selectedPersonel.id);
                fetchPersonel();
            } catch {
                toast.error('Gagal menghapus data');
            }
        }
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
            <Toaster position="top-right" richColors />

            <div className="page-header mb-4">
                <h1 className="page-title">Manajemen Catatan Pelanggaran</h1>
                <p className="page-subtitle">Daftar personel dengan indikasi atau riwayat pelanggaran.</p>
            </div>

            {/* List Personel untuk dipilih */}
            <div className="page-actions">
                <div className="search-bar">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Cari Personel..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {loading ? <div className="loading-state">Memuat Data...</div> : (
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>NRP / NIP</th>
                                <th>Nama Lengkap</th>
                                <th>Pangkat / Jabatan</th>
                                <th>Kasus Aktif & Riwayat</th>
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {personelList.map(p => (
                                <tr key={p.id}>
                                    <td>
                                        <span style={{ fontWeight: 600 }}>{p.nrpNip}</span>
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
                                    <td>
                                        <button
                                            className="btn-primary"
                                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                                            onClick={() => handleSelectPersonel(p.id)}
                                        >
                                            <FileText size={16} /> Lihat Catatan
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal Detail & List Pelanggaran Per Personel */}
            <Modal isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} title={`Catatan Personel: ${selectedPersonel?.namaLengkap}`}>
                {selectedPersonel && (
                    <div style={{ minWidth: '700px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <div>
                                <h4 style={{ margin: 0, color: 'var(--primary-color)' }}>{selectedPersonel.nrpNip} - {selectedPersonel.pangkat}</h4>
                                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{selectedPersonel.jabatan} | {selectedPersonel.satker?.nama}</p>
                            </div>
                            <button className="btn-primary" onClick={handleOpenAdd}>
                                <Plus size={16} /> Tambah Catatan
                            </button>
                        </div>

                        {selectedPersonel.pelanggaran?.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                                <CheckCircle size={48} style={{ margin: '0 auto 1rem', color: 'var(--success)' }} opacity={0.5} />
                                <p>Personel ini tidak memiliki catatan pelanggaran.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {selectedPersonel.pelanggaran.map(pel => (
                                    <div key={pel.id} style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', background: 'white', position: 'relative' }}>

                                        <div style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', gap: '0.5rem' }}>
                                            <button className="btn-icon" onClick={() => handleOpenEdit(pel)}><Edit2 size={16} /></button>
                                            <button className="btn-icon delete" onClick={() => handleDelete(pel.id)}><Trash2 size={16} /></button>
                                        </div>

                                        <h5 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--danger)', paddingRight: '60px' }}>
                                            {pel.wujudPerbuatan}
                                        </h5>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem', marginBottom: '1rem' }}>
                                            <div>
                                                <p><strong>Dasar Surat:</strong> {pel.nomorSurat} ({format(new Date(pel.tanggalSurat), 'dd MMM yyyy')})</p>
                                                {pel.fileDasarUrl && <a href={`http://localhost:5000${pel.fileDasarUrl}`} target="_blank" rel="noreferrer" style={{ color: 'var(--info)', fontSize: '0.8rem' }}>&#128206; Lihat Berkas Dasar</a>}
                                            </div>
                                            <div>
                                                {pel.statusPenyelesaian === 'MENJALANI_HUKUMAN' && (
                                                    <p><strong>Sidang:</strong> {pel.jenisSidang || '-'} | <strong>Hukuman:</strong> {pel.hukuman || '-'}</p>
                                                )}
                                                <p><strong>Status:</strong> {renderStatusBadge(pel.statusPenyelesaian)}</p>
                                                {pel.keteranganSelesai && <p style={{ fontSize: '0.8rem', fontStyle: 'italic', marginTop: '4px', color: 'var(--text-muted)' }}>"{pel.keteranganSelesai}"</p>}
                                            </div>
                                        </div>

                                        {(pel.fileSelesaiUrl || pel.tanggalRekomendasi) && (
                                            <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '4px', fontSize: '0.85rem', borderLeft: '3px solid var(--success)' }}>
                                                {pel.tanggalRekomendasi && <p style={{ margin: '0 0 0.25rem 0' }}><strong>Bisa rekomendasi sejak:</strong> {format(new Date(pel.tanggalRekomendasi), 'dd MMM yyyy')}</p>}
                                                {pel.fileSelesaiUrl && <a href={`http://localhost:5000${pel.fileSelesaiUrl}`} target="_blank" rel="noreferrer" style={{ color: 'var(--info)' }}>&#128206; Lihat Berkas Putusan/Selesai</a>}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            {/* Reusable Form Modal Component */}
            <PelanggaranFormModal
                isOpen={isFormModalOpen}
                onClose={() => setIsFormModalOpen(false)}
                onSuccess={handleFormSuccess}
                isEdit={!!editData}
                initialData={editData}
                targetPersonel={selectedPersonel}
            />
        </div>
    );
};

export default Pelanggaran;
