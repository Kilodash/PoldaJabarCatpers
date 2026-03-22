import React, { useState, useEffect } from 'react';
import {
    ChevronLeft, Copy, Printer, Plus, CheckCircle, XCircle, Edit2, Trash2, ExternalLink, FileText, AlertCircle, Eye, Download
} from 'lucide-react';
import { format } from 'date-fns';
import api from '../utils/api';
import { toast } from 'sonner';
import Modal from './Modal';
import PelanggaranFormModal from './PelanggaranFormModal';
import { useAuth } from '../context/AuthContext';

const PersonelHistoryModal = ({ isOpen, onClose, personelId, onRefresh, initialData = null }) => {
    const { user } = useAuth();
    const [personel, setPersonel] = useState(initialData);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5; // Smaller for modal

    // Sub-modal states
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [selectedPelanggaran, setSelectedPelanggaran] = useState(null);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, alasan: '' });
    const [rejectModal, setRejectModal] = useState({ isOpen: false, id: null, catatan: '' });

    // Helper untuk format tanggal aman (tidak crash pada Invalid Date)
    const formatDateSafe = (dateStr, formatStr = 'dd/MM/yyyy') => {
        if (!dateStr) return '-';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return '-';
            return format(d, formatStr);
        } catch (e) {
            return '-';
        }
    };

    const fetchDetail = async () => {
        if (!personelId) return;
        setLoading(true);
        setError(null);
        try {
            const res = await api.get(`/personel/${personelId}`);
            setPersonel(res.data);
        } catch (error) {
            console.error("Gagal memuat detail riwayat:", error);
            setError("Gagal memuat detail riwayat terupdate.");
            // Don't auto-close immediately, allow user to see current/error state
            if (!personel) {
                toast.error("Gagal memuat detail riwayat");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            if (personelId) {
                // If we have initialData and its ID matches, use it first
                if (initialData && initialData.id === personelId) {
                    setPersonel(initialData);
                } else if (!personel || personel.id !== personelId) {
                    setPersonel(null);
                }

                fetchDetail();
                setCurrentPage(1);
            }
        }
    }, [isOpen, personelId]);

    const paginatedPelanggaran = (personel?.pelanggaran || []).slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const totalPages = Math.ceil((personel?.pelanggaran?.length || 0) / itemsPerPage);

    const generateHistoryText = () => {
        if (!personel) return "";
        let text = `RIWAYAT CATATAN PERSONEL\n=========================\n\n`;
        text += `DATA PERSONEL:\n`;
        text += `NRP/NIP         : ${personel.nrpNip}\n`;
        text += `Nama            : ${personel.namaLengkap}\n`;
        text += `Pangkat         : ${personel.pangkat}\n`;
        text += `Jabatan         : ${personel.jabatan}\n`;
        text += `Satker          : ${personel.satker?.nama || '-'}\n\n`;

        text += `DAFTAR CATATAN / PELANGGARAN:\n`;
        const listCatpers = personel.pelanggaran || [];
        if (listCatpers.length === 0) {
            text += `- Bersih / Tidak ada catatan pelanggaran.\n`;
        } else {
            listCatpers.forEach((pel, idx) => {
                const formatDate = (date) => formatDateSafe(date);

                text += `${idx + 1}. Wujud Perbuatan : ${pel.wujudPerbuatan}\n`;
                text += `   Informasi Dasar :\n`;
                text += `   - Jenis Dasar   : ${pel.jenisDasar || '-'}\n`;
                text += `   - No. Surat     : ${pel.nomorSurat || '-'}\n`;
                text += `   - Tgl. Surat    : ${formatDate(pel.tanggalSurat)}\n`;
                text += `   - Tgl. Entry    : ${formatDate(pel.createdAt)}\n`;
                if (pel.keteranganDasar) text += `   - Keterangan    : ${pel.keteranganDasar}\n`;

                text += `   Status Akhir    : `;
                let statusLabel = pel.statusPenyelesaian === 'TIDAK_TERBUKTI'
                    ? (pel.nomorSktb || pel.tanggalSktb ? 'TIDAK TERBUKTI SIDANG' : 'TIDAK TERBUKTI RIKSA')
                    : (pel.statusPenyelesaian === 'Belum ada SKTT' ? 'TIDAK TERBUKTI RIKSA (BELUM ADA SKTT)' :
                        pel.statusPenyelesaian === 'Belum ada SKTB' ? 'TIDAK TERBUKTI SIDANG (BELUM ADA SKTB)' :
                            (pel.statusPenyelesaian || 'PROSES').replace(/_/g, ' '));
                text += `${statusLabel}\n`;

                // Detail Sidang / Putusan
                if (pel.jenisSidang) {
                    text += `   Detail Sidang   :\n`;
                    text += `   - Jenis Sidang  : ${pel.jenisSidang}\n`;
                    text += `   - No. SKEP      : ${pel.nomorSkep || '-'}\n`;
                    text += `   - Tgl. SKEP     : ${formatDate(pel.tanggalSkep)}\n`;
                    text += `   - Sanksi/Hukuman: ${pel.hukuman || '-'}\n`;
                    if (pel.banding) {
                        text += `   - Banding       : Ya\n`;
                        text += `   - No. SKEP Bdg  : ${pel.nomorSkepBanding || '-'}\n`;
                        text += `   - Tgl. SKEP Bdg : ${formatDate(pel.tanggalSkepBanding)}\n`;
                    }
                }

                // Detail Surat Penyelesaian / SP3 / SKTT / SKTB
                if (pel.nomorSuratSelesai || pel.nomorSp3 || pel.nomorSktt || pel.nomorSktb) {
                    text += `   Dokumen Selesai :\n`;
                    if (pel.nomorSuratSelesai) text += `   - No. Srt Selsi : ${pel.nomorSuratSelesai} (${formatDate(pel.tanggalSuratSelesai)})\n`;
                    if (pel.nomorSp3) text += `   - No. SP3       : ${pel.nomorSp3} (${formatDate(pel.tanggalSp3)})\n`;
                    if (pel.nomorSktt) text += `   - No. SKTT      : ${pel.nomorSktt} (${formatDate(pel.tanggalSktt)})\n`;
                    if (pel.nomorSktb) text += `   - No. SKTB      : ${pel.nomorSktb} (${formatDate(pel.tanggalSktb)})\n`;
                    if (pel.keteranganSelesai) text += `   - Ket. Selesai  : ${pel.keteranganSelesai}\n`;
                }

                // Rekomendasi
                if (pel.tanggalRekomendasi || pel.tanggalBisaAjukanRps) {
                    text += `   Rekomendasi     :\n`;
                    if (pel.nomorRekomendasi) text += `   - No. Rekom     : ${pel.nomorRekomendasi}\n`;
                    if (pel.tanggalRekomendasi) text += `   - Tgl. Rekom     : ${formatDate(pel.tanggalRekomendasi)}\n`;
                    if (pel.tanggalBisaAjukanRps && !pel.tanggalRekomendasi) {
                        text += `   - Syarat Rekom  : Bisa diajukan setelah ${formatDate(pel.tanggalBisaAjukanRps)}\n`;
                    }
                }

                text += `\n`;
            });
        }
        return text;
    };

    const handleCopy = () => {
        const text = generateHistoryText();
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            toast.success("Data berhasil disalin ke clipboard.");
        }).catch(() => toast.error("Gagal menyalin data."));
    };

    const handlePrint = () => {
        const text = generateHistoryText();
        if (!text || !personel) return;

        // Check if mobile device
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (isMobile) {
            // Mobile-friendly approach: Create hidden print div in current document
            handleMobilePrint(text);
        } else {
            // Desktop approach: Use popup window
            handleDesktopPrint(text);
        }
    };

    const handleMobilePrint = (text) => {
        const now = new Date().toLocaleString('id-ID') + ' WIB';
        const escapedText = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        
        // Create temporary print div
        const printDiv = document.createElement('div');
        printDiv.id = 'print-content-temp';
        printDiv.innerHTML = `
            <div class="print-header">
                <h2>Riwayat Catatan Personel</h2>
                <p>Sistem Catatan Personel (CDS) Polda Jabar</p>
                <p>Dicetak pada: ${now}</p>
            </div>
            <pre>${escapedText}</pre>
            <div class="print-footer">CDS Polda Jabar — ${now}</div>
        `;
        
        // Add print styles
        const styleEl = document.createElement('style');
        styleEl.id = 'print-style-temp';
        styleEl.textContent = `
            @media print {
                body * { visibility: hidden; }
                #print-content-temp, #print-content-temp * { visibility: visible; }
                #print-content-temp { 
                    position: absolute; 
                    left: 0; 
                    top: 0; 
                    width: 100%; 
                    font-family: 'Courier New', Courier, monospace;
                    font-size: 10pt;
                    line-height: 1.5;
                }
                #print-content-temp .print-header {
                    text-align: center;
                    border-bottom: 2px solid #333;
                    padding-bottom: 10px;
                    margin-bottom: 16px;
                }
                #print-content-temp .print-header h2 {
                    text-transform: uppercase;
                    font-size: 12pt;
                    letter-spacing: 1px;
                    margin-bottom: 4px;
                }
                #print-content-temp .print-header p {
                    font-size: 9pt;
                    color: #444;
                }
                #print-content-temp pre {
                    white-space: pre-wrap;
                    word-break: break-word;
                    font-family: inherit;
                    font-size: inherit;
                    line-height: inherit;
                }
                #print-content-temp .print-footer {
                    margin-top: 24px;
                    text-align: right;
                    font-size: 8.5pt;
                    color: #555;
                    border-top: 1px solid #ccc;
                    padding-top: 6px;
                }
            }
        `;
        
        document.head.appendChild(styleEl);
        document.body.appendChild(printDiv);
        
        // Print
        window.print();
        
        // Cleanup
        setTimeout(() => {
            document.body.removeChild(printDiv);
            document.head.removeChild(styleEl);
        }, 100);
    };

    const handleDesktopPrint = (text) => {
        const printWindow = window.open('', '_blank', 'width=800,height=900');
        if (!printWindow) {
            toast.error('Popup diblokir browser. Izinkan popup untuk fitur cetak.');
            // Fallback to mobile approach
            handleMobilePrint(text);
            return;
        }

        const now = new Date().toLocaleString('id-ID') + ' WIB';
        const escapedText = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        printWindow.document.write(`<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Riwayat Catatan - ${personel.namaLengkap}</title>
<style>
  @page { size: A4 portrait; margin: 2cm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Courier New', Courier, monospace; font-size: 10.5pt; line-height: 1.5; color: #000; background: white; }
  .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 16px; }
  .header h2 { text-transform: uppercase; font-size: 12pt; letter-spacing: 1px; margin-bottom: 4px; }
  .header p { font-size: 9pt; color: #444; }
  pre { white-space: pre-wrap; word-break: break-word; font-family: inherit; font-size: inherit; line-height: inherit; }
  .footer { margin-top: 24px; text-align: right; font-size: 8.5pt; color: #555; border-top: 1px solid #ccc; padding-top: 6px; }
</style>
</head>
<body>
<div class="header">
  <h2>Riwayat Catatan Personel</h2>
  <p>Sistem Catatan Personel (CDS) Polda Jabar</p>
  <p>Dicetak pada: ${now}</p>
</div>
<pre>${escapedText}</pre>
<div class="footer">CDS Polda Jabar &mdash; ${now}</div>
</body>
</html>`);

        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 400);
    };


    const handleApprove = async (id) => {
        try {
            await api.post(`/pelanggaran/approve/${id}`);
            toast.success('Catatan pelanggaran telah disetujui.');
            fetchDetail();
            if (onRefresh) onRefresh();
        } catch { toast.error('Gagal menyetujui data.'); }
    };

    const confirmReject = async () => {
        if (!rejectModal.catatan.trim()) {
            toast.error('Catatan revisi wajib diisi.');
            return;
        }
        try {
            await api.post(`/pelanggaran/reject/${rejectModal.id}`, { catatanRevisi: rejectModal.catatan });
            toast.success('Draft berhasil dikembalikan untuk revisi.');
            setRejectModal({ isOpen: false, id: null, catatan: '' });
            fetchDetail();
            if (onRefresh) onRefresh();
        } catch { toast.error('Gagal memproses penolakan.'); }
    };

    const confirmDelete = async () => {
        try {
            await api.delete(`/pelanggaran/${deleteModal.id}`, { data: { alasan: deleteModal.alasan } });
            toast.success('Catatan berhasil dihapus (soft delete).');
            setDeleteModal({ isOpen: false, id: null, alasan: '' });
            fetchDetail();
            if (onRefresh) onRefresh();
        } catch { toast.error('Gagal menghapus data.'); }
    };

    const renderAttachment = (url, title) => {
        if (!url) return null;
        const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
        const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
        const isPdf = url.toLowerCase().endsWith('.pdf');
        return (
            <div style={{ marginTop: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ background: 'var(--bg-color)', padding: '0.5rem 1rem', borderBottom: '1px solid var(--border-color)', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{title}</span>
                    <a href={fullUrl} target="_blank" rel="noreferrer" className="btn-secondary" style={{ padding: '4px 12px', fontSize: '0.8rem' }}>
                        Buka <ExternalLink size={14} style={{ marginLeft: '4px' }} />
                    </a>
                </div>
                <div style={{ width: '100%', height: '350px', background: '#f8fafc', display: 'flex', justifyContent: 'center' }}>
                    {isPdf ? (
                        <object data={fullUrl} type="application/pdf" width="100%" height="100%"><p>PDF tidak didukung. <a href={fullUrl}>Unduh</a></p></object>
                    ) : (
                        <img src={fullUrl} alt={title} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                    )}
                </div>
            </div>
        );
    };

    if (!isOpen) return null;

    const isSameSatker = personel && user && (
        String(personel.satkerId) === String(user.satkerId) ||
        String(personel.satkerId) === String(user.satker?.id)
    );
    const canEdit = user?.role === 'ADMIN_POLDA' || isSameSatker;
    const isAktif = personel?.statusKeaktifan === 'AKTIF';

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title={personel ? `Catatan: ${personel.namaLengkap}` : (loading ? "Memuat..." : "Detail Personel")} maxWidth="90%">
                {error && (
                    <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4 text-red-700 no-print">
                        <div className="flex items-center gap-2">
                            <AlertCircle size={18} />
                            <span>{error}</span>
                        </div>
                    </div>
                )}

                {!personel ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand"></div>
                        <p className="text-muted font-medium">Memuat Rekam Jejak...</p>
                    </div>
                ) : (
                    <div style={{ opacity: loading ? 0.7 : 1, transition: 'opacity 0.2s' }}>
                        {loading && (
                            <div className="no-print" style={{ color: 'var(--text-muted)', fontSize: '0.8rem', paddingBottom: '0.5rem', fontStyle: 'italic' }}>
                                &#9203; Sedang memperbarui data terbaru...
                            </div>
                        )}
                        <style type="text/css" media="print">
                            {`
                            @page {
                                size: A4 landscape !important;
                                margin: 15mm !important;
                            }
                            `}
                        </style>
                        <div className="print-section no-print">
                            <h3>Identitas Personel</h3>
                            <div style={{ fontSize: '1rem', lineHeight: '2.0', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
                                <div><strong>NRP / NIP:</strong> {personel?.nrpNip || '-'}</div>
                                <div><strong>Nama Lengkap:</strong> {personel?.namaLengkap || '-'}</div>
                                <div><strong>Pangkat / Gol:</strong> {personel?.pangkat || '-'}</div>
                                <div><strong>Jabatan:</strong> {personel?.jabatan || '-'}</div>
                                <div><strong>Kesatuan:</strong> {personel?.satker?.nama || '-'}</div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }} className="no-print">
                            <h3 style={{ margin: 0 }}>Riwayat Catatan ({personel.pelanggaran?.length || 0})</h3>
                            <div className="flex gap-2 page-actions">
                                <button className="btn-secondary" onClick={handleCopy} title="Salin ke Clipboard" style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem' }}>
                                    <Copy size={15} /> <span className="hide-on-mobile">Salin</span>
                                </button>
                                <button className="btn-secondary" onClick={handlePrint} title="Cetak Riwayat" style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem' }}>
                                    <Printer size={15} /> <span className="hide-on-mobile">Cetak</span>
                                </button>
                                {canEdit && isAktif && (
                                    <button className="btn-primary" style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: 'var(--success)', borderColor: 'var(--success)' }} onClick={() => { setSelectedPelanggaran(null); setIsEdit(false); setIsFormModalOpen(true); }}><Plus size={15} /> Tambah</button>
                                )}
                            </div>
                        </div>

                        <div style={{ overflowX: 'auto', marginTop: '0.5rem' }}>
                            <table className="data-table no-print">
                                <thead>
                                    <tr>
                                        <th>TANGGAL LHP</th>
                                        <th>TANGGAL ENTRY</th>
                                        <th>WUJUD PERBUATAN</th>
                                        <th>PENYELESAIAN</th>
                                        <th>REKOMENDASI</th>
                                        {isAktif && <th className="no-print">AKSI</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {personel.pelanggaran?.length === 0 ? (
                                        <tr><td colSpan="5" style={{ textAlign: 'center', padding: '1rem', color: 'var(--success)' }}>Bersih dari catatan pelanggaran.</td></tr>
                                    ) : (
                                        paginatedPelanggaran.map(pel => (
                                            <tr key={pel.id} style={{ background: pel.isDraft ? 'rgba(255, 0, 0, 0.05)' : 'transparent' }}>
                                                <td>{formatDateSafe(pel.tanggalSurat)}</td>
                                                <td style={{ color: 'var(--text-muted)', fontSize: '0.85em' }}>
                                                    {formatDateSafe(pel.createdAt)}
                                                    {pel.isDraft && <span className="badge-draft" style={{ marginLeft: '5px' }}>DRAFT</span>}
                                                </td>
                                                <td>
                                                    <div style={{ fontWeight: 600 }}>{pel.wujudPerbuatan}</div>
                                                    {pel.catatanRevisi && <div className="revisi-note"><strong>⚠️ Revisi:</strong> {pel.catatanRevisi}</div>}
                                                    {!['TIDAK_TERBUKTI_RIKSA', 'TIDAK_TERBUKTI_SIDANG', 'PERDAMAIAN'].includes(pel.statusPenyelesaian) && (
                                                        <div style={{ marginTop: '4px' }}>
                                                            {pel.jenisSidang && <strong style={{ color: 'var(--danger)', fontSize: '0.85em' }}>Sidang {pel.jenisSidang}</strong>}
                                                            <div style={{ color: 'var(--text-muted)', fontSize: '0.85em' }}>{pel.hukuman || '-'}</div>
                                                        </div>
                                                    )}
                                                </td>
                                                <td>
                                                    <span className={`badge-status status-${(pel.statusPenyelesaian || 'PROSES').toLowerCase().replace(/ /g, '-')}`}>
                                                        {pel.statusPenyelesaian === 'PROSES' ? 'DALAM PROSES' :
                                                            pel.statusPenyelesaian === 'MENJALANI_HUKUMAN' ? 'MENJALANI_HUKUMAN' :
                                                                pel.statusPenyelesaian === 'Belum ada SKTT' ? 'TIDAK TERBUKTI RIKSA (BELUM ADA SKTT)' :
                                                                    pel.statusPenyelesaian === 'Belum ada SKTB' ? 'TIDAK TERBUKTI SIDANG (BELUM ADA SKTB)' :
                                                                        pel.statusPenyelesaian === 'TIDAK_TERBUKTI' ?
                                                                            (pel.nomorSktb || pel.tanggalSktb || pel.fileSktbUrl ? 'TIDAK TERBUKTI SIDANG' : 'TIDAK TERBUKTI RIKSA') :
                                                                            (pel.statusPenyelesaian || 'PROSES').replace(/_/g, ' ')}
                                                    </span>
                                                </td>
                                                <td>
                                                    {['PROSES', 'TIDAK_TERBUKTI', 'TIDAK_TERBUKTI_RIKSA', 'TIDAK_TERBUKTI_SIDANG', 'PERDAMAIAN', 'Belum ada SKTT', 'Belum ada SKTB'].includes(pel.statusPenyelesaian) ? null : (
                                                        pel.tanggalRekomendasi ? (
                                                            <div><span style={{ color: 'var(--success)', fontWeight: 'bold' }}>Selesai {formatDateSafe(pel.tanggalRekomendasi)}</span></div>
                                                        ) : (pel.tanggalBisaAjukanRps && new Date() < new Date(pel.tanggalBisaAjukanRps) ? (
                                                            <div style={{ color: 'var(--warning)', fontWeight: 600 }}>&#9203; Menunggu {formatDateSafe(pel.tanggalBisaAjukanRps)}</div>
                                                        ) : <span style={{ color: 'var(--danger)' }}>Belum Ada</span>)
                                                    )}
                                                </td>
                                                {isAktif && (
                                                    <td className="no-print">
                                                        <div className="action-btns">
                                                            {canEdit && (
                                                                <>
                                                                    {pel.isDraft && user?.role === 'ADMIN_POLDA' ? (
                                                                        <>
                                                                            <button className="btn-icon" onClick={() => { setSelectedPelanggaran(pel); setIsEdit(true); setIsFormModalOpen(true); }} style={{ color: 'var(--info)' }} title="Lihat Catatan / Review"><Eye size={16} /></button>
                                                                            <button className="btn-icon" style={{ color: 'var(--success)' }} onClick={() => handleApprove(pel.id)} title="Setujui"><CheckCircle size={16} /></button>
                                                                            <button className="btn-icon" style={{ color: 'var(--danger)' }} onClick={() => { setRejectModal({ isOpen: true, id: pel.id, catatan: '' }); }} title="Tolak & Minta Revisi"><XCircle size={16} /></button>
                                                                        </>
                                                                    ) : (
                                                                        <button className="btn-icon" onClick={() => { setSelectedPelanggaran(pel); setIsEdit(true); setIsFormModalOpen(true); }} title="Edit"><Edit2 size={16} /></button>
                                                                    )}
                                                                    {user?.role === 'ADMIN_POLDA' && (
                                                                        <button className="btn-icon delete" onClick={() => setDeleteModal({ isOpen: true, id: pel.id, alasan: '' })} title="Hapus"><Trash2 size={16} /></button>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', padding: '0 0.5rem', fontSize: '0.85rem' }}>
                                    <div style={{ color: 'var(--text-muted)' }}>
                                        Hal {currentPage} dari {totalPages}
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
                                            className="btn-secondary"
                                            style={{ padding: '0.3rem 0.6rem', opacity: currentPage === 1 ? 0.5 : 1 }}
                                        >
                                            Prev
                                        </button>
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                            disabled={currentPage === totalPages}
                                            className="btn-secondary"
                                            style={{ padding: '0.3rem 0.6rem', opacity: currentPage === totalPages ? 0.5 : 1 }}
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="only-print" style={{ marginTop: '0', padding: '1rem', paddingBottom: '2rem', fontFamily: 'monospace', fontSize: '10pt', lineHeight: '1.4', color: '#000' }}>
                            <div style={{ textAlign: 'center', borderBottom: '2px solid #333', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                                <h2 style={{ textTransform: 'uppercase', margin: '0 0 0.25rem 0', fontSize: '13pt', letterSpacing: '1px' }}>Riwayat Catatan Personel</h2>
                                <p style={{ margin: 0, fontSize: '10pt' }}>Sistem Catatan Personel (CDS) Polda Jabar</p>
                                <p style={{ margin: '0.2rem 0 0 0', fontSize: '9pt', color: '#555' }}>Dicetak pada: {formatDateSafe(new Date(), 'dd/MM/yyyy HH:mm')} WIB</p>
                            </div>
                            <div style={{ whiteSpace: 'pre-wrap' }}>
                                {generateHistoryText()}
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Sub Modals */}
            <PelanggaranFormModal
                isOpen={isFormModalOpen} onClose={() => setIsFormModalOpen(false)}
                onSuccess={() => { fetchDetail(); if (onRefresh) onRefresh(); }}
                isEdit={isEdit} initialData={selectedPelanggaran} targetPersonel={personel}
            />

            <Modal isOpen={deleteModal.isOpen} onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })} title="Hapus Riwayat">
                <div style={{ marginBottom: '1rem' }}>Tindakan ini akan menghapus data secara administratif. Alasan wajib diisi.</div>
                <textarea className="form-input" rows="3" value={deleteModal.alasan} onChange={(e) => setDeleteModal({ ...deleteModal, alasan: e.target.value })} placeholder="Alasan penghapusan..." />
                <div className="form-actions mt-4">
                    <button className="btn-secondary" onClick={() => setDeleteModal({ ...deleteModal, isOpen: false })}>Batal</button>
                    <button className="btn-primary" style={{ background: 'var(--danger)' }} onClick={confirmDelete} disabled={!deleteModal.alasan.trim()}><Trash2 size={16} /> Hapus</button>
                </div>
            </Modal>

            <Modal isOpen={rejectModal.isOpen} onClose={() => setRejectModal({ ...rejectModal, isOpen: false })} title="Kembalikan untuk Revisi">
                <div style={{ marginBottom: '1rem' }}>Berikan instruksi perbaikan untuk operator.</div>
                <textarea className="form-input" rows="4" value={rejectModal.catatan} onChange={(e) => setRejectModal({ ...rejectModal, catatan: e.target.value })} placeholder="Instruksi revisi..." />
                <div className="form-actions mt-4">
                    <button className="btn-secondary" onClick={() => setRejectModal({ ...rejectModal, isOpen: false })}>Batal</button>
                    <button className="btn-primary" style={{ background: 'var(--warning)', color: '#000' }} onClick={confirmReject} disabled={!rejectModal.catatan.trim()}><XCircle size={16} /> Kirim Revisi</button>
                </div>
            </Modal>

        </>
    );
};

export default PersonelHistoryModal;
