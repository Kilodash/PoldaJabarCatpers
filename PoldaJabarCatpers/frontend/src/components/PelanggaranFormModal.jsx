import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import api from '../utils/api';
import Modal from './Modal';

// Opsi Sanksi
const sanksiDisiplinOptions = [
    "Teguran tertulis",
    "Penundaan mengikuti pendidikan paling lama 1 (satu) tahun",
    "Penundaan kenaikan gaji berkala",
    "Penundaan kenaikan pangkat untuk paling lama 1 (satu) tahun",
    "Mutasi yang bersifat demosi",
    "Pembebasan dari jabatan",
    "Penempatan dalam tempat khusus paling lama 21 (dua puluh satu) hari",
    "Pemberatan Patus maksimal 7 hari"
];

const sanksiKeppOptions = [
    "Perilaku pelanggar dinyatakan sebagai perbuatan tercela",
    "Kewajiban pelanggar untuk meminta maaf kepada institusi/pihak yang dirugikan",
    "Mengikuti pembinaan mental kepribadian, kejiwaan, keagamaan, dan pengetahuan profesi",
    "Mutasi bersifat demosi (penurunan jabatan/posisi)",
    "Penundaan mengikuti pendidikan (paling lama 1 tahun)",
    "Penundaan kenaikan gaji berkala",
    "Penundaan kenaikan pangkat (paling lama 1 tahun)",
    "Pembebasan dari jabatan",
    "Penempatan dalam tempat khusus (paling lama 21 hari)",
    "PTDH (Pemberhentian Tidak Dengan Hormat) sebagai anggota Polri"
];

const pangkatPolri = ["Bharada", "Bharatu", "Bharaka", "Abripda", "Abriptu", "Abrip", "Bripda", "Briptu", "Brigadir", "Bripka", "Aipda", "Aiptu", "Ipda", "Iptu", "AKP", "Kompol", "AKBP", "Kombes Pol", "Brigjen Pol", "Irjen Pol", "Komjen Pol", "Jenderal Pol"];
const pangkatPns = ["Pengatur Muda (II/a)", "Pengatur Muda Tk. I (II/b)", "Pengatur (II/c)", "Pengatur Tk. I (II/d)", "Penata Muda (III/a)", "Penata Muda Tk. I (III/b)", "Penata (III/c)", "Penata Tk. I (III/d)", "Pembina (IV/a)", "Pembina Tk. I (IV/b)", "Pembina Utama Muda (IV/c)", "Pembina Utama Madya (IV/d)", "Pembina Utama (IV/e)"];

const PelanggaranFormModal = ({ isOpen, onClose, onSuccess, isEdit = false, initialData = null, targetPersonel = null }) => {
    const defaultFormState = {
        id: '',
        personelId: '',

        // 1. Dasar Catpers
        jenisDasar: 'Hasil Lidik Terbukti',
        nomorSurat: '',
        tanggalSurat: '',
        wujudPerbuatan: '',
        pangkatSaatMelanggar: '',
        jabatanSaatMelanggar: '',
        satkerSaatMelanggar: '',
        keteranganDasar: '',

        // 2. Penyelesaian & 3. Sidang
        statusPenyelesaian: 'PROSES', // PROSES | TIDAK_TERBUKTI | PERDAMAIAN | SIDANG

        // Atribut Penyelesaian Biasa
        nomorSuratSelesai: '',
        tanggalSuratSelesai: '',
        keteranganSelesai: '', // keterangan damai / tidak terbukti
        tanggalRekomendasi: '',
        nomorRekomendasi: '',

        // Atribut Khusus Sidang (Ditampilkan jika status=SIDANG)
        jenisSidang: '', // DISIPLIN | KEPP | PIDANA
        banding: 'false',
        hukuman: '', // Akan menyimpan JSON Array dari checklist hukuman yang dipilih / longtext
        nomorSkep: '',
        tanggalSkep: '',
        tanggalBisaAjukanRps: '',
    };

    const [formData, setFormData] = useState(defaultFormState);
    const [fileDasar, setFileDasar] = useState(null);
    const [fileSelesai, setFileSelesai] = useState(null);
    const [filePutusan, setFilePutusan] = useState(null);
    const [fileRekomendasi, setFileRekomendasi] = useState(null);
    const [satkerList, setSatkerList] = useState([]);
    const [nomorSuratError, setNomorSuratError] = useState('');

    // State untuk multi-select Array Sanksi Hukuman
    const [selectedHukumanDisiplin, setSelectedHukumanDisiplin] = useState([]);
    const [selectedHukumanKepp, setSelectedHukumanKepp] = useState([]);

    // Fetch satker list saat form dibuka
    useEffect(() => {
        if (isOpen) {
            api.get('/satker').then(res => setSatkerList(res.data)).catch(() => { });
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            if (isEdit && initialData) {
                // Parse Hukuman ke bentuk Checkbox Arrays
                let parsedDisiplin = [];
                let parsedKepp = [];
                let rawHukuman = initialData.hukuman || '';

                if (initialData.jenisSidang === 'DISIPLIN' || initialData.jenisSidang === 'KEPP') {
                    try {
                        const parsed = JSON.parse(rawHukuman);
                        if (Array.isArray(parsed)) {
                            if (initialData.jenisSidang === 'DISIPLIN') parsedDisiplin = parsed;
                            if (initialData.jenisSidang === 'KEPP') parsedKepp = parsed;
                        }
                    } catch (e) {
                        // Fallback untuk data lama yang masih plaintext
                        if (initialData.jenisSidang === 'DISIPLIN') parsedDisiplin = [rawHukuman];
                        if (initialData.jenisSidang === 'KEPP') parsedKepp = [rawHukuman];
                    }
                }

                setSelectedHukumanDisiplin(parsedDisiplin);
                setSelectedHukumanKepp(parsedKepp);

                // Rekonstruksi Form
                setFormData({
                    ...initialData,
                    jenisDasar: initialData.jenisDasar || 'Hasil Lidik Terbukti',
                    statusPenyelesaian: (initialData.statusPenyelesaian === 'MENJALANI_HUKUMAN' || initialData.jenisSidang) ? 'SIDANG' : initialData.statusPenyelesaian,
                    tanggalSurat: initialData.tanggalSurat ? format(new Date(initialData.tanggalSurat), 'yyyy-MM-dd') : '',
                    tanggalSuratSelesai: initialData.tanggalSuratSelesai ? format(new Date(initialData.tanggalSuratSelesai), 'yyyy-MM-dd') : '',
                    tanggalRekomendasi: initialData.tanggalRekomendasi ? format(new Date(initialData.tanggalRekomendasi), 'yyyy-MM-dd') : '',
                    nomorRekomendasi: initialData.nomorRekomendasi || '',
                    banding: initialData.banding ? 'true' : 'false',
                    keteranganSelesai: initialData.keteranganSelesai || '',
                    hukuman: initialData.jenisSidang === 'PIDANA' ? rawHukuman : '', // hanya Pidana yang murni teks utuh
                    nomorSkep: initialData.nomorSkep || '',
                    tanggalSkep: initialData.tanggalSkep ? format(new Date(initialData.tanggalSkep), 'yyyy-MM-dd') : '',
                    tanggalBisaAjukanRps: initialData.tanggalBisaAjukanRps ? format(new Date(initialData.tanggalBisaAjukanRps), 'yyyy-MM-dd') : '',
                    pangkatSaatMelanggar: initialData.pangkatSaatMelanggar || '',
                    jabatanSaatMelanggar: initialData.jabatanSaatMelanggar || '',
                    satkerSaatMelanggar: initialData.satkerSaatMelanggar || ''
                });
            } else {
                setFormData({
                    ...defaultFormState,
                    personelId: targetPersonel?.id || '',
                    pangkatSaatMelanggar: targetPersonel?.pangkat || '',
                    jabatanSaatMelanggar: targetPersonel?.jabatan || '',
                    satkerSaatMelanggar: targetPersonel?.satker?.nama || ''
                });
                setSelectedHukumanDisiplin([]);
                setSelectedHukumanKepp([]);
            }
            setFileDasar(null);
            setFileSelesai(null);
            setFilePutusan(null);
            setFileRekomendasi(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, isEdit, initialData, targetPersonel]);

    // Helper: angka -> angka Romawi
    const toRoman = (month) => {
        const r = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
        return r[month - 1] || '';
    };

    // Validasi format Nomor Surat berdasarkan jenisDasar
    const validateNomorSurat = (nomor, jenis) => {
        if (!nomor) return '';
        if (jenis === 'Hasil Lidik Terbukti') {
            // Format: R/LHP-{angka}/{romawi}/HUK.12.10./{tahun}/Paminal
            const ok = /^R\/LHP-\d+\/[IVX]+\/HUK\.12\.10\.\d{4}\/Paminal$/.test(nomor) ||
                /^R\/LHP-\s*\d*\s*\/[IVX]+\/HUK\.12\.10\.\s*\/\d{4}\/Paminal$/.test(nomor) ||
                nomor.startsWith('R/LHP-');
            if (!ok) return 'Format tidak sesuai. Contoh: R/LHP-01/IV/HUK.12.10./2025/Paminal';
        }
        if (jenis === 'LP Pidana') {
            // Format: LP/A-{angka}/{romawi}/{tahun}
            const ok = /^LP\/A-\d+\/[IVX]+\/\d{4}$/.test(nomor) ||
                nomor.startsWith('LP/A-');
            if (!ok) return 'Format tidak sesuai. Contoh: LP/A-01/IV/2025';
        }
        return '';
    };

    const generateNomorSurat = (jenis, tgl) => {
        if (!tgl) return '';
        const d = new Date(tgl);
        const bulan = toRoman(d.getMonth() + 1);
        const tahun = d.getFullYear();
        if (jenis === 'Hasil Lidik Terbukti') return `R/LHP-   /${bulan}/HUK.12.10./${tahun}/Paminal`;
        if (jenis === 'LP Pidana') return `LP/A-   /${bulan}/${tahun}`;
        return '';
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        // Auto-format nomor surat saat tanggal atau jenis berubah
        if (name === 'tanggalSurat') {
            const generated = generateNomorSurat(formData.jenisDasar, value);
            if (generated) setFormData(prev => ({ ...prev, [name]: value, nomorSurat: generated }));
        }
        if (name === 'jenisDasar') {
            const generated = generateNomorSurat(value, formData.tanggalSurat);
            if (generated) setFormData(prev => ({ ...prev, [name]: value, nomorSurat: generated }));
            // Re-validasi nomor surat jika jenis berubah
            setNomorSuratError(validateNomorSurat(formData.nomorSurat, value));
        }
        if (name === 'nomorSurat') {
            setNomorSuratError(validateNomorSurat(value, formData.jenisDasar));
        }

        // Reset state bawah ketika mengubah cabang pilihan Atas
        if (name === 'statusPenyelesaian') {
            if (value !== 'SIDANG') {
                setFormData(prev => ({ ...prev, jenisSidang: '', banding: 'false', hukuman: '', tanggalBisaAjukanRps: '' }));
                setFilePutusan(null);
            } else {
                setFormData(prev => ({ ...prev, jenisSidang: 'DISIPLIN' })); // Default pas buka Sidang
            }
        }
    };

    const handleCheckboxChange = (setter, item, e) => {
        const isChecked = e.target.checked;
        setter(prev => {
            if (isChecked) return [...prev, item];
            return prev.filter(i => i !== item);
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Blokir submit jika nomor surat format salah
        const nomorErr = validateNomorSurat(formData.nomorSurat, formData.jenisDasar);
        if (nomorErr) {
            setNomorSuratError(nomorErr);
            toast.error('Periksa kembali format Nomor Surat Dasar.');
            return;
        }

        try {
            const submitData = new FormData();

            // Build Payload dinamis
            const payload = { ...formData };

            if (payload.statusPenyelesaian === 'SIDANG') {
                payload.statusPenyelesaian = 'MENJALANI_HUKUMAN'; // Set balik enum ke database

                // Set Hukuman stringified value
                if (payload.jenisSidang === 'DISIPLIN') {
                    payload.hukuman = JSON.stringify(selectedHukumanDisiplin);
                } else if (payload.jenisSidang === 'KEPP') {
                    payload.hukuman = JSON.stringify(selectedHukumanKepp);
                }
                // PIDANA sudah ditangani onChange biasa (longtext)
            } else {
                // Kosongkan atribut sidang jika tidak sidang
                payload.jenisSidang = '';
                payload.hukuman = '';
                payload.banding = 'false';
                payload.nomorSkep = '';
                payload.tanggalSkep = '';
                payload.tanggalBisaAjukanRps = '';
            }

            if (payload.statusPenyelesaian !== 'SIDANG' && payload.statusPenyelesaian !== 'TIDAK_TERBUKTI') {
                payload.nomorRekomendasi = '';
                payload.tanggalRekomendasi = '';
            }

            // Append Text Data
            Object.keys(payload).forEach(key => {
                if (payload[key] !== null && payload[key] !== '') {
                    submitData.append(key, payload[key]);
                }
            });

            // Append Files
            if (fileDasar) submitData.append('fileDasar', fileDasar);
            if (fileSelesai && formData.statusPenyelesaian !== 'SIDANG') submitData.append('fileSelesai', fileSelesai);
            if (filePutusan && formData.statusPenyelesaian === 'SIDANG') submitData.append('filePutusan', filePutusan);
            if (fileRekomendasi && (formData.statusPenyelesaian === 'SIDANG' || formData.statusPenyelesaian === 'TIDAK_TERBUKTI')) {
                submitData.append('fileRekomendasi', fileRekomendasi);
            }

            if (isEdit) {
                await api.put(`/pelanggaran/${formData.id}`, submitData, { headers: { 'Content-Type': 'multipart/form-data' } });
                toast.success('Rekam jejak pelanggaran berhasil diupdate.');
            } else {
                await api.post('/pelanggaran', submitData, { headers: { 'Content-Type': 'multipart/form-data' } });
                toast.success('Rekam jejak pelanggaran terbaru berhasil diunggah.');
            }

            if (onSuccess) onSuccess();
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Gagal menyimpan riwayat ke sistem.');
        }
    };

    const isRpsLocked = formData.statusPenyelesaian === 'SIDANG' && formData.tanggalBisaAjukanRps && new Date() < new Date(formData.tanggalBisaAjukanRps);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? "Revisi Catatan Pelanggaran" : "Entri Catatan Pelanggaran Baru"}>
            <form onSubmit={handleSubmit} style={{ minWidth: '700px', maxHeight: '80vh', overflowY: 'auto', paddingRight: '1rem' }}>

                {targetPersonel && (
                    <div style={{ background: 'var(--primary-color)', color: 'white', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                        <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>Target Personel:</div>
                        <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{targetPersonel.namaLengkap} ({targetPersonel.nrpNip})</div>
                        <div style={{ fontSize: '0.9rem' }}>{targetPersonel.pangkat} - {targetPersonel.jabatan}</div>
                    </div>
                )}

                {/* 1. DASAR CATPERS */}
                <fieldset style={{ border: '2px solid var(--border)', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem', background: '#f8fafc' }}>
                    <legend style={{ padding: '0 0.75rem', fontWeight: 700, color: 'var(--primary-color)', fontSize: '1.05rem', background: 'white', border: '1px solid var(--border)', borderRadius: '20px' }}>1. Dasar Catpers / Legalitas</legend>

                    <div className="form-group">
                        <label>Wujud Perbuatan Pelanggaran (Deskripsi Kasus) <span style={{ color: 'var(--danger)' }}>*</span></label>
                        <textarea className="form-input" name="wujudPerbuatan" value={formData.wujudPerbuatan} onChange={handleChange} rows={2} required placeholder="Gambarkan pelanggaran yang dilakukan..."></textarea>
                    </div>

                    {/* Row 1: Pangkat + Jabatan + Satker saat melanggar */}
                    <div className="flex gap-4">
                        <div className="form-group w-full">
                            <label>Pangkat Saat Melanggar <span style={{ color: 'var(--danger)' }}>*</span></label>
                            <select className="form-input" name="pangkatSaatMelanggar" value={formData.pangkatSaatMelanggar || ''} onChange={handleChange} required>
                                <option value="">-- Pilih Pangkat --</option>
                                <optgroup label="POLRI">
                                    {pangkatPolri.map(p => <option key={p} value={p}>{p}</option>)}
                                </optgroup>
                                <optgroup label="PNS">
                                    {pangkatPns.map(p => <option key={p} value={p}>{p}</option>)}
                                </optgroup>
                            </select>
                        </div>
                        <div className="form-group w-full">
                            <label>Jabatan Saat Melanggar <span style={{ color: 'var(--danger)' }}>*</span></label>
                            <input type="text" className="form-input" name="jabatanSaatMelanggar" value={formData.jabatanSaatMelanggar || ''} onChange={handleChange} required placeholder="Jabatan saat kejadian..." />
                        </div>
                        <div className="form-group w-full">
                            <label>Satker Saat Melanggar <span style={{ color: 'var(--danger)' }}>*</span></label>
                            <select className="form-input" name="satkerSaatMelanggar" value={formData.satkerSaatMelanggar || ''} onChange={handleChange} required>
                                <option value="">-- Pilih Satker --</option>
                                {satkerList.map(s => <option key={s.id} value={s.nama}>{s.nama}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Row 2: Jenis Dasar + Tanggal Surat */}
                    <div className="flex gap-4">
                        <div className="form-group w-full">
                            <label>Jenis Dasar Surat</label>
                            <select className="form-input" name="jenisDasar" value={formData.jenisDasar} onChange={handleChange} required>
                                <option value="Hasil Lidik Terbukti">Hasil Lidik Terbukti</option>
                                <option value="Riksa Provos">Riksa Provos</option>
                                <option value="Riksa/Audit Wabprof">Riksa/Audit Wabprof</option>
                                <option value="LP Pidana">Laporan Polisi (LP) Pidana</option>
                            </select>
                        </div>
                        <div className="form-group w-full">
                            <label>Tanggal Surat Dasar</label>
                            <input type="date" className="form-input" name="tanggalSurat" value={formData.tanggalSurat} onChange={handleChange} required />
                        </div>
                    </div>

                    {/* Row 3: Nomor Surat (auto-format) */}
                    <div className="form-group">
                        <label>Nomor Surat Dasar <span style={{ color: 'var(--danger)' }}>*</span>
                            {formData.tanggalSurat && ['Hasil Lidik Terbukti', 'LP Pidana'].includes(formData.jenisDasar) && (
                                <span style={{ fontSize: '0.78rem', color: 'var(--info)', marginLeft: '0.5rem', fontWeight: 400 }}>Format otomatis — edit angka urut di bagian kosong</span>
                            )}
                        </label>
                        <input
                            type="text"
                            className="form-input"
                            name="nomorSurat"
                            value={formData.nomorSurat}
                            onChange={handleChange}
                            required
                            placeholder="Isi / koreksi nomor surat..."
                            style={nomorSuratError ? { borderColor: 'var(--danger)', background: '#fff5f5' } : {}}
                        />
                        {nomorSuratError && (
                            <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ fontWeight: 700 }}>&#9888;</span> {nomorSuratError}
                            </div>
                        )}
                    </div>

                    {/* Row 4: Upload Berkas + Keterangan */}
                    <div className="flex gap-4">
                        <div className="form-group w-full">
                            <label>Unggah Berkas Dasar (PDF/IMG, Max 5MB)</label>
                            <input type="file" className="form-input" accept=".pdf,image/*" onChange={(e) => setFileDasar(e.target.files[0])} />
                            {isEdit && initialData?.fileDasarUrl && <div style={{ fontSize: '0.8rem', color: 'var(--info)', marginTop: '4px' }}>&#10003; Berkas lama sudah tersimpan di server.</div>}
                        </div>
                        <div className="form-group w-full">
                            <label>Keterangan Dasar (Opsional)</label>
                            <input type="text" className="form-input" name="keteranganDasar" value={formData.keteranganDasar || ''} onChange={handleChange} />
                        </div>
                    </div>
                </fieldset>


                {/* 2. PENYELESAIAN */}
                <fieldset style={{ border: '2px solid var(--border)', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem' }}>
                    <legend style={{ padding: '0 0.75rem', fontWeight: 700, color: 'var(--primary-color)', fontSize: '1.05rem', background: 'white', border: '1px solid var(--border)', borderRadius: '20px' }}>2. Alur Penyelesaian</legend>

                    <div className="form-group">
                        <label>Pilih Metode Penyelesaian Terakhir</label>
                        <select className="form-input" name="statusPenyelesaian" value={formData.statusPenyelesaian} onChange={handleChange} style={{ border: '2px solid var(--primary-color)', fontWeight: 600 }} required>
                            <option value="PROSES">DALAM PROSES (Belum Sidang / Menunggu Putusan)</option>
                            <option value="TIDAK_TERBUKTI">TIDAK TERBUKTI (Kasus Gugur / SP3)</option>
                            <option value="PERDAMAIAN">PERDAMAIAN (Restorative Justice)</option>
                            <option value="SIDANG">DILANJUTKAN KE SIDANG</option>
                        </select>
                    </div>

                    {formData.statusPenyelesaian === 'TIDAK_TERBUKTI' || formData.statusPenyelesaian === 'PERDAMAIAN' ? (
                        <div style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '8px', border: '1px dashed var(--success)' }}>
                            <h4 style={{ color: 'var(--success)', marginTop: 0, marginBottom: '1rem' }}>Formulir Resolusi Damai / Tidak Terbukti</h4>
                            <div className="flex gap-4">
                                <div className="form-group w-full">
                                    <label>No. Surat Penyelesaian / Ketetapan</label>
                                    <input type="text" className="form-input" name="nomorSuratSelesai" value={formData.nomorSuratSelesai || ''} onChange={handleChange} required />
                                </div>
                                <div className="form-group w-full">
                                    <label>Tanggal Surat Selesai</label>
                                    <input type="date" className="form-input" name="tanggalSuratSelesai" value={formData.tanggalSuratSelesai || ''} onChange={handleChange} required />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Keterangan Penyelesaian (Bagaimana Kasus Diakhiri?)</label>
                                <textarea className="form-input" name="keteranganSelesai" value={formData.keteranganSelesai || ''} onChange={handleChange} rows={2} required></textarea>
                            </div>
                            <div className="form-group mb-0">
                                <label>Unggah Berkas Penghentian / Damai</label>
                                <input type="file" className="form-input" accept=".pdf,image/*" onChange={(e) => setFileSelesai(e.target.files[0])} />
                            </div>
                        </div>
                    ) : null}
                </fieldset>

                {/* 3. PROSES SIDANG (Hanya Muncul Jika Pilih SIDANG) */}
                {formData.statusPenyelesaian === 'SIDANG' && (
                    <fieldset style={{ border: '2px solid var(--warning)', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem', background: '#fffbeb' }}>
                        <legend style={{ padding: '0 0.75rem', fontWeight: 700, color: 'var(--warning)', fontSize: '1.05rem', background: 'white', border: '1px solid var(--warning)', borderRadius: '20px' }}>3. Rekam Putusan Sidang & Sanksi</legend>

                        <div className="flex gap-4">
                            <div className="form-group w-full">
                                <label>Jenis Peradilan/Sidang</label>
                                <select className="form-input" name="jenisSidang" value={formData.jenisSidang || ''} onChange={handleChange} style={{ fontWeight: 600 }}>
                                    <option value="DISIPLIN">Sidang DISIPLIN</option>
                                    <option value="KEPP">Sidang Kode Etik (KKEPP)</option>
                                    <option value="PIDANA">Sidang PIDANA / Umum</option>
                                </select>
                            </div>
                            <div className="form-group w-full">
                                <label>Status Banding Terdakwa</label>
                                <select className="form-input" name="banding" value={formData.banding} onChange={handleChange}>
                                    <option value="false">Tidak Mengajukan Banding (Inkracht)</option>
                                    <option value="true">Mengajukan Banding</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-4 mb-4">
                            <div className="form-group w-full">
                                <label>Nomor SKEP Hukuman</label>
                                <input type="text" className="form-input" name="nomorSkep" value={formData.nomorSkep || ''} onChange={handleChange} required={formData.statusPenyelesaian === 'SIDANG'} />
                            </div>
                            <div className="form-group w-full">
                                <label>Tanggal SKEP Hukuman</label>
                                <input type="date" className="form-input" name="tanggalSkep" value={formData.tanggalSkep || ''} onChange={handleChange} required={formData.statusPenyelesaian === 'SIDANG'} />
                            </div>
                        </div>

                        <div className="form-group mb-4">
                            <label>Saran Tanggal Bisa Mengajukan RPS (Opsional)</label>
                            <input type="date" className="form-input" name="tanggalBisaAjukanRps" value={formData.tanggalBisaAjukanRps || ''} onChange={handleChange} style={{ border: '1px solid var(--info)' }} />
                            <small style={{ color: 'var(--text-muted)' }}>* Form Penginputan RPS (Bagian 4) akan ditutup sampai tanggal ini terlewati, jika diisi.</small>
                        </div>

                        {/* Rendering Format Sanksi Sesuai Jenis Sidang */}
                        <div className="form-group" style={{ background: 'white', padding: '1rem', borderRadius: '4px', border: '1px solid var(--border)' }}>
                            <label style={{ fontSize: '1rem', color: 'var(--danger)' }}>Rincian Vonis / Sanksi Hukuman yang Diberikan</label>

                            {formData.jenisSidang === 'DISIPLIN' && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 1fr)', gap: '0.5rem', marginTop: '0.5rem' }}>
                                    {sanksiDisiplinOptions.map(opt => (
                                        <label key={opt} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
                                            <input type="checkbox" checked={selectedHukumanDisiplin.includes(opt)} onChange={(e) => handleCheckboxChange(setSelectedHukumanDisiplin, opt, e)} style={{ marginTop: '0.2rem' }} />
                                            <span style={{ lineHeight: 1.4 }}>{opt}</span>
                                        </label>
                                    ))}
                                </div>
                            )}

                            {formData.jenisSidang === 'KEPP' && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 1fr)', gap: '0.5rem', marginTop: '0.5rem' }}>
                                    {sanksiKeppOptions.map(opt => (
                                        <label key={opt} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
                                            <input type="checkbox" checked={selectedHukumanKepp.includes(opt)} onChange={(e) => handleCheckboxChange(setSelectedHukumanKepp, opt, e)} style={{ marginTop: '0.2rem' }} />
                                            <span style={{ lineHeight: 1.4 }}>{opt}</span>
                                        </label>
                                    ))}
                                </div>
                            )}

                            {formData.jenisSidang === 'PIDANA' && (
                                <textarea className="form-input mt-2" name="hukuman" value={formData.hukuman || ''} onChange={handleChange} rows={4} required placeholder="Ketikkan secara rinci vonis pidana yang dijatuhkan (Contoh: Divonis kurungan 2 tahun penjara dikurangi masa tahanan berdasarkan Pasal 351 KUHP...)" style={{ minHeight: '100px' }}></textarea>
                            )}
                        </div>

                        <div className="form-group">
                            <label>Unggah Berkas Putusan Sidang / SKEP</label>
                            <input type="file" className="form-input" accept=".pdf,image/*" onChange={(e) => setFilePutusan(e.target.files[0])} />
                            {isEdit && initialData?.filePutusanUrl && <div style={{ fontSize: '0.8rem', color: 'var(--info)', marginTop: '4px' }}>&#10003; Salinan putusan telah ter-upload.</div>}
                        </div>

                    </fieldset>
                )}


                {/* 4. DETAIL RPS */}
                {(formData.statusPenyelesaian === 'SIDANG' || formData.statusPenyelesaian === 'TIDAK_TERBUKTI') && (
                    <fieldset style={{ border: `2px solid ${isRpsLocked ? '#cbd5e1' : 'var(--info)'}`, borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem', background: isRpsLocked ? '#f8fafc' : '#eff6ff', opacity: isRpsLocked ? 0.7 : 1 }}>
                        <legend style={{ padding: '0 0.75rem', fontWeight: 700, color: isRpsLocked ? '#64748b' : 'var(--info)', fontSize: '1.05rem', background: 'white', border: `1px solid ${isRpsLocked ? '#cbd5e1' : 'var(--info)'}`, borderRadius: '20px' }}>4. Detail Pemulihan Status (RPS)</legend>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem', marginTop: '-0.5rem' }}>
                            Wajib diisi jika Personel telah mendapatkan surat Rekomendasi Pemulihan Status (RPS).
                        </p>

                        {isRpsLocked && (
                            <div style={{ background: '#fff3cd', color: '#856404', padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.9rem', border: '1px solid #ffeeba' }}>
                                <strong>&#9888; Pengajuan RPS Terkunci.</strong><br />
                                Personel masih dalam masa hukuman dan hanya bisa mengajukan RPS setelah tanggal <strong>{format(new Date(formData.tanggalBisaAjukanRps), 'dd/MM/yyyy')}</strong>.
                            </div>
                        )}

                        <div className="flex gap-4">
                            <div className="form-group w-full">
                                <label>Nomor Surat RPS</label>
                                <input type="text" className="form-input" name="nomorRekomendasi" value={formData.nomorRekomendasi || ''} onChange={handleChange} placeholder="Kosongkan jika RPS belum turun" disabled={isRpsLocked} />
                            </div>
                            <div className="form-group w-full">
                                <label>Tanggal Surat RPS</label>
                                <input type="date" className="form-input" name="tanggalRekomendasi" value={formData.tanggalRekomendasi || ''} onChange={handleChange} disabled={isRpsLocked} />
                            </div>
                        </div>

                        <div className="form-group mb-0">
                            <label>Unggah Berkas RPS (PDF/IMG)</label>
                            <input type="file" className="form-input" accept=".pdf,image/*" onChange={(e) => setFileRekomendasi(e.target.files[0])} disabled={isRpsLocked} />
                            {isEdit && initialData?.fileRekomendasiUrl && <div style={{ fontSize: '0.8rem', color: 'var(--info)', marginTop: '4px' }}>&#10003; Salinan RPS telah ter-upload.</div>}
                        </div>
                    </fieldset>
                )}


                <div className="form-actions" style={{ position: 'sticky', bottom: 0, background: 'var(--bg-color)', padding: '1rem 0', borderTop: '1px solid var(--border)' }}>
                    <button type="button" className="btn-secondary" onClick={onClose} style={{ padding: '0.75rem 1.5rem' }}>Batalkan</button>
                    <button type="submit" className="btn-primary" style={{ padding: '0.75rem 2rem' }}>&#10004; {isEdit ? "Simpan Perubahan Catatan" : "Tambah ke Riwayat"}</button>
                </div>

            </form>
        </Modal>
    );
};

export default PelanggaranFormModal;
