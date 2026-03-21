import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Toaster, toast } from 'sonner';
import { Search, FileText, Upload, AlertTriangle, Eye, Plus, Edit2, Trash2, CheckCircle, Copy, Printer } from 'lucide-react';
import { format } from 'date-fns';
import api from '../utils/api';
import PersonelHistoryModal from '../components/PersonelHistoryModal';
import './Pencarian.css';

const Pencarian = () => {
    const [manualInput, setManualInput] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [loadingManual, setLoadingManual] = useState(false);
    const [loadingFile, setLoadingFile] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [hasSearched, setHasSearched] = useState(false);
    const [showAllResults, setShowAllResults] = useState(false);

    // Modal States
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [selectedPersonelId, setSelectedPersonelId] = useState(null);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Sorting State
    const [sortConfig, setSortConfig] = useState({ key: 'nrpNip', direction: 'asc' });

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedResults = [...(showAllResults || searchResults.length < 5 ? searchResults : searchResults.filter(item => item.found))].sort((a, b) => {
        let valA, valB;
        if (sortConfig.key === 'namaSesuai') {
            valA = a.personel?.namaLengkap || (a.found ? '' : 'ZZZ');
            valB = b.personel?.namaLengkap || (b.found ? '' : 'ZZZ');
        } else if (sortConfig.key === 'satker') {
            valA = a.personel?.satker?.nama || '';
            valB = b.personel?.satker?.nama || '';
        } else if (sortConfig.key === 'statusCatatan') {
            valA = a.found && a.personel?.pelanggaran?.length > 0 ? 1 : 0;
            valB = b.found && b.personel?.pelanggaran?.length > 0 ? 1 : 0;
        } else {
            valA = a[sortConfig.key] || '';
            valB = b[sortConfig.key] || '';
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const paginatedResults = sortedResults.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handleManualSearch = useCallback(async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        const input = manualInput;
        if (!input.trim() || input.trim().length < 3) return;

        setLoadingManual(true);
        try {
            const response = await api.post('/pencarian/manual', { textInput: input });
            setSearchResults(response.data.data);
            setHasSearched(true);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingManual(false);
            setCurrentPage(1);
        }
    }, [manualInput]);

    // Removed debounced auto-search effect. Search now only occurs via manual form submit.

    const handleFileSearch = async (e) => {
        e.preventDefault();
        if (!selectedFile) {
            toast.error("Silakan pilih file PDF terlebih dahulu");
            return;
        }

        setLoadingFile(true);
        const formData = new FormData();
        formData.append('dokumen', selectedFile);

        try {
            const response = await api.post('/pencarian/document', formData);

            setSearchResults(response.data.data);
            setHasSearched(true);
            toast.success("Ekstraksi & Pencarian berhasil");
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || "Terjadi kesalahan saat memproses dokumen");
        } finally {
            setLoadingFile(false);
            setCurrentPage(1);
        }
    };

    const handleSelectPersonel = (id) => {
        setSelectedPersonelId(id);
        setIsMenuOpen(true);
    };

    const handleRefresh = async () => {
        if (!selectedPersonelId) return;
        try {
            const res = await api.get(`/personel/${selectedPersonelId}`);

            // Update di searchResults agar konsisten
            setSearchResults(prev => prev.map(item => {
                if (item.personel?.id === selectedPersonelId) {
                    return { ...item, personel: res.data };
                }
                return item;
            }));
        } catch (error) {
            console.error("Gagal refresh data:", error);
        }
    };


    const selectedPersonelData = useMemo(() => {
        if (!selectedPersonelId) return null;
        return searchResults.find(item => item.personel?.id === selectedPersonelId)?.personel;
    }, [searchResults, selectedPersonelId]);


    return (
        <div className="pencarian-container">

            <div className="search-methods-wrapper no-print">
                {/* Manual Search Card */}
                <div className="search-card">
                    <h3><FileText size={20} /> Input Teks / Manual</h3>
                    <form onSubmit={handleManualSearch}>
                        <div className="form-group">
                            <label>Masukkan list NRP/NIP (Satu baris satu data)</label>
                            <p className="help-text">Format yang didukung: "12345678" atau "12345678, Budi Santoso"</p>
                            <textarea
                                className="textarea-input"
                                value={manualInput}
                                onChange={(e) => setManualInput(e.target.value)}
                                placeholder="Contoh:&#10;85010234, Susanto&#10;198501012005011002, Rini"
                            ></textarea>
                        </div>
                        <button type="submit" className="btn-primary" disabled={loadingManual || loadingFile}>
                            {loadingManual ? 'Mencari...' : <><Search size={18} /> Cari Data</>}
                        </button>
                    </form>
                </div>

                {/* Upload PDF Search Card */}
                <div className="search-card">
                    <h3><Upload size={20} /> Ekstraksi via Dokumen PDF</h3>
                    <form onSubmit={handleFileSearch}>
                        <div className="form-group">
                            <label>Upload File Rekapan Dokumen (PDF)</label>
                            <p className="help-text">Sistem akan secara otomatis membaca dan mencari NRP/NIP yang terdapat dalam dokumen.</p>
                            <input
                                type="file"
                                accept=".pdf"
                                className="file-input"
                                onChange={(e) => setSelectedFile(e.target.files[0])}
                            />
                        </div>
                        <button type="submit" className="btn-primary" disabled={loadingManual || loadingFile}>
                            {loadingFile ? 'Memproses Dokumen...' : <><Search size={18} /> Ekstrak & Cari</>}
                        </button>
                    </form>
                </div>
            </div>

            {hasSearched && (
                <div className="results-section mt-6 animate-fade-in">
                    <div className="only-print" style={{ marginBottom: '2rem', textAlign: 'center', borderBottom: '2px solid #333', paddingBottom: '1rem' }}>
                        <h2 style={{ textTransform: 'uppercase', margin: '0 0 0.5rem 0' }}>Laporan Hasil Pencarian Data Personel</h2>
                        <p style={{ margin: 0 }}>Dicetak pada: {new Date().toLocaleString('id-ID')}</p>
                    </div>
                    <div className="results-header no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)', padding: '1rem 1.5rem', borderRadius: '16px', boxShadow: 'var(--shadow-premium)', border: '1px solid var(--border-color)' }}>
                        <h3 style={{ margin: 0, fontWeight: 700, color: 'var(--primary-color)' }}>
                            <CheckCircle size={20} style={{ verticalAlign: 'middle', marginRight: '8px', color: 'var(--success)' }} />
                            Hasil Analisis ({sortedResults.length} Ditampilkan / {searchResults.length} Total)
                        </h3>
                        <div className="filter-toggle" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                                type="checkbox"
                                id="showAllToggle"
                                checked={showAllResults}
                                onChange={(e) => {
                                    setShowAllResults(e.target.checked);
                                    setCurrentPage(1);
                                }}
                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                            <label htmlFor="showAllToggle" style={{ fontSize: '14px', color: '#64748b', cursor: 'pointer', userSelect: 'none' }}>Tampilkan Semua (Termasuk Tidak Ditemukan)</label>
                        </div>
                    </div>
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '40px' }}>No.</th>
                                    <th onClick={() => requestSort('nrpNip')} style={{ cursor: 'pointer' }}>NRP / NIP <span className="no-print">{sortConfig.key === 'nrpNip' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</span></th>
                                    <th onClick={() => requestSort('inputName')} style={{ cursor: 'pointer' }}>Input Nama <span className="no-print">{sortConfig.key === 'inputName' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</span></th>
                                    <th onClick={() => requestSort('namaSesuai')} style={{ cursor: 'pointer' }}>Nama Sesuai Sistem <span className="no-print">{sortConfig.key === 'namaSesuai' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</span></th>
                                    <th>Status Identitas</th>
                                    <th onClick={() => requestSort('satker')} style={{ cursor: 'pointer' }}>Satker <span className="no-print">{sortConfig.key === 'satker' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</span></th>
                                    <th onClick={() => requestSort('statusCatatan')} style={{ cursor: 'pointer' }}>Status Catatan <span className="no-print">{sortConfig.key === 'statusCatatan' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</span></th>
                                    <th className="no-print">Aksi</th>
                                </tr>
                            </thead>
                            {paginatedResults.length === 0 ? (
                                <tbody>
                                    <tr>
                                        <td colSpan="8" style={{ textAlign: 'center', padding: '24px' }}>Tidak ada data yang sesuai.</td>
                                    </tr>
                                </tbody>
                            ) : (
                                <>
                                    {/* SCREEN VIEW: Paginated */}
                                    <tbody className="no-print">
                                        {paginatedResults.map((item, idx) => {
                                            let statusCatatan = 'Bersih';
                                            if (item.personel && item.personel.pelanggaran && item.personel.pelanggaran.length > 0) {
                                                const approvedViolations = item.personel.pelanggaran.filter(v => !v.isDraft);
                                                let maxSeverity = 0;
                                                for (const v of approvedViolations) {
                                                    if (v.statusPenyelesaian === 'PROSES') maxSeverity = Math.max(maxSeverity, 2);
                                                    else if (v.statusPenyelesaian === 'MENJALANI_HUKUMAN') maxSeverity = Math.max(maxSeverity, v.tanggalRekomendasi ? 1 : 2);
                                                    else if (['TIDAK_TERBUKTI_RIKSA', 'TIDAK_TERBUKTI_SIDANG', 'TIDAK_TERBUKTI', 'PERDAMAIAN'].includes(v.statusPenyelesaian)) maxSeverity = Math.max(maxSeverity, 0);
                                                    else if (v.tanggalRekomendasi) maxSeverity = Math.max(maxSeverity, 1);
                                                }
                                                if (maxSeverity === 2) statusCatatan = 'Ada Catatan Aktif';
                                                else if (maxSeverity === 1) statusCatatan = 'Pernah Tercatat';
                                            }

                                            return (
                                                <tr key={`screen-${idx}`}>
                                                    <td style={{ textAlign: 'center' }}>{((currentPage - 1) * itemsPerPage) + idx + 1}</td>
                                                    <td>{item.nrpNip}</td>
                                                    <td>{item.inputName || '-'}</td>
                                                    <td>
                                                        {item.found ? (
                                                            <strong>{item.personel.namaLengkap}</strong>
                                                        ) : (
                                                            <span className="badge-error">Tidak Ditemukan di DB</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        {item.found && (
                                                            item.personel.statusKeaktifan !== 'AKTIF' || item.personel.deletedAt ? (
                                                                <span className="badge-error" style={{ textTransform: 'uppercase' }}>
                                                                    {item.personel.statusKeaktifan || 'TIDAK AKTIF'}
                                                                </span>
                                                            ) : item.nameMismatch ? (
                                                                <span className="badge-warning" title="Nama pada input/dokumen tidak sesuai atau tidak tercantum jelas di dokumen">
                                                                    <AlertTriangle size={14} /> Nama Tidak Sesuai
                                                                </span>
                                                            ) : (
                                                                <span className="badge-success">Sesuai</span>
                                                            )
                                                        )}
                                                        {!item.found && '-'}
                                                    </td>
                                                    <td>{item.found ? item.personel.satker?.nama : '-'}</td>
                                                    <td>
                                                        {item.found && statusCatatan === 'Ada Catatan Aktif' ? (
                                                            <>
                                                                <span className="badge-warning no-print">Ada Catatan Aktif</span>
                                                                <span className="only-print">Ada Catatan Aktif</span>
                                                            </>
                                                        ) : item.found && statusCatatan === 'Pernah Tercatat' ? (
                                                            <>
                                                                <span className="no-print" style={{ background: '#f59e0b', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600 }}>Pernah Tercatat</span>
                                                                <span className="only-print">Pernah Tercatat</span>
                                                            </>
                                                        ) : item.found ? (
                                                            <>
                                                                <span className="badge-success no-print">Bersih</span>
                                                                <span className="only-print">Bersih</span>
                                                            </>
                                                        ) : '-'}
                                                    </td>
                                                    <td className="no-print">
                                                        {item.found && item.personel && (
                                                            <button
                                                                className="btn-icon"
                                                                onClick={() => handleSelectPersonel(item.personel.id)}
                                                                title="Lihat Histori"
                                                            >
                                                                <Eye size={18} />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>

                                    {/* PRINT VIEW: Full List */}
                                    <tbody className="only-print">
                                        {searchResults.map((item, idx) => {
                                            let statusCatatan = 'Bersih';
                                            if (item.found && item.personel && item.personel.pelanggaran && item.personel.pelanggaran.length > 0) {
                                                const approvedViolations = item.personel.pelanggaran.filter(v => !v.isDraft);
                                                let maxSeverity = 0;
                                                for (const v of approvedViolations) {
                                                    if (v.statusPenyelesaian === 'PROSES') maxSeverity = Math.max(maxSeverity, 2);
                                                    else if (v.statusPenyelesaian === 'MENJALANI_HUKUMAN') maxSeverity = Math.max(maxSeverity, v.tanggalRekomendasi ? 1 : 2);
                                                    else if (['TIDAK_TERBUKTI_RIKSA', 'TIDAK_TERBUKTI_SIDANG', 'TIDAK_TERBUKTI', 'PERDAMAIAN'].includes(v.statusPenyelesaian)) maxSeverity = Math.max(maxSeverity, 0);
                                                    else if (v.tanggalRekomendasi) maxSeverity = Math.max(maxSeverity, 1);
                                                }
                                                if (maxSeverity === 2) statusCatatan = 'Ada Catatan Aktif';
                                                else if (maxSeverity === 1) statusCatatan = 'Pernah Tercatat';
                                            }
                                            return (
                                                <tr key={`print-${idx}`}>
                                                    <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                                                    <td>{item.nrpNip}</td>
                                                    <td>{item.inputName || '-'}</td>
                                                    <td>{item.found && item.personel ? item.personel.namaLengkap : 'Tidak Ditemukan'}</td>
                                                    <td>{item.found && item.personel ? (item.personel.statusKeaktifan !== 'AKTIF' ? item.personel.statusKeaktifan : (item.nameMismatch ? 'Nama Tidak Sesuai' : 'Sesuai')) : '-'}</td>
                                                    <td>{item.found && item.personel ? item.personel.satker?.nama : '-'}</td>
                                                    <td>{item.found ? statusCatatan : '-'}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </>
                            )}
                        </table>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', padding: '0 0.5rem' }}>
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                    Menampilkan {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, sortedResults.length)} dari {sortedResults.length} hasil
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
                </div>
            )}

            {/* Unified History Modal */}
            <PersonelHistoryModal
                isOpen={isMenuOpen}
                onClose={() => setIsMenuOpen(false)}
                personelId={selectedPersonelId}
                initialData={selectedPersonelData}
                onRefresh={handleRefresh}
            />
        </div>
    );
};

export default Pencarian;
