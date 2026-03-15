import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import api from '../utils/api';
import Modal from './Modal';
import { useAuth } from '../context/AuthContext';
import { useDashboard } from '../context/DashboardContext';
import { RotateCcw, Trash2, AlertCircle, CheckCircle } from 'lucide-react';


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
    const { user } = useAuth();
    const { refresh: refreshDashboard } = useDashboard();
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
        satkerSaatMelanggar: user?.satker?.nama || '',
        keteranganDasar: '',

        // 2. Penyelesaian & 3. Sidang
        statusPenyelesaian: 'PROSES', // PROSES | TIDAK_TERBUKTI | PERDAMAIAN | SIDANG

        // Atribut Penyelesaian Biasa
        nomorSuratSelesai: '',
        tanggalSuratSelesai: '',
        keteranganSelesai: '', // keterangan damai / tidak terbukti
        tanggalRekomendasi: '',
        nomorRekomendasi: '',

        // Atribut SP3 (Jika status=TIDAK_TERBUKTI_RIKSA)
        nomorSp3: '',
        tanggalSp3: '',

        // Atribut Khusus Sidang (Ditampilkan jika status=SIDANG)
        jenisSidang: '', // DISIPLIN | KEPP | PIDANA
        banding: 'false',
        nomorSkepBanding: '',
        tanggalSkepBanding: '',
        hukuman: '', // Akan menyimpan JSON Array dari checklist hukuman yang dipilih / longtext
        nomorSkep: '',
        tanggalSkep: '',
        tanggalBisaAjukanRps: '',

        // SKTT / SKTB
        nomorSktt: '',
        tanggalSktt: '',
        nomorSktb: '',
        tanggalSktb: '',
    };

    const [formData, setFormData] = useState(defaultFormState);
    const [fileDasar, setFileDasar] = useState([]);
    const [fileSelesai, setFileSelesai] = useState([]);
    const [filePutusan, setFilePutusan] = useState([]);
    const [fileRekomendasi, setFileRekomendasi] = useState([]);
    const [fileSktt, setFileSktt] = useState([]);
    const [fileSp3, setFileSp3] = useState([]);
    const [fileSktb, setFileSktb] = useState([]);
    const [fileBanding, setFileBanding] = useState([]); // File SKEP Banding
    const [deletedFiles, setDeletedFiles] = useState([]); // Track whole fields to be deleted
    const [deletedItems, setDeletedItems] = useState([]); // Track individual file URLs to be deleted
    const [satkerList, setSatkerList] = useState([]);

    const [mandatoryFields, setMandatoryFields] = useState([]);
    const isMandatory = (field) => mandatoryFields.includes(field);
    const renderAsterisk = (field) => isMandatory(field) ? <span style={{ color: 'var(--danger)', marginLeft: '4px' }}>*</span> : null;

    const [selectedHukumanDisiplin, setSelectedHukumanDisiplin] = useState([]);
    const [selectedHukumanKepp, setSelectedHukumanKepp] = useState([]);

    // API Base URL for file viewing
    const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

    // State untuk Reset Section
    const [resetModal, setResetModal] = useState({ isOpen: false, section: '', alasan: '' });
    const [statusChangeModal, setStatusChangeModal] = useState({ isOpen: false, pendingStatus: '' });
    const [showPtdhWarning, setShowPtdhWarning] = useState(false); // Modal untuk peringatan PTDH
    const [currentRecord, setCurrentRecord] = useState(initialData);

    // Helper: Ambil nama file dari URL
    const getFilename = (url) => {
        if (!url) return '';
        const parts = url.split('/');
        return parts[parts.length - 1];
    };

    // Helper Rendering Multi File Link
    const renderServerFiles = (urlsString, fieldKey, titleLabel) => {
        if (!urlsString) return null;
        if (deletedFiles.includes(fieldKey)) return <div style={{ fontSize: '0.8rem', color: 'var(--danger)', marginTop: '4px' }}>Seluruh file {titleLabel} lama akan dihapus setelah disimpan.</div>;

        const urls = urlsString.split(',').filter(u => u).filter(u => !deletedItems.includes(u));
        if (urls.length === 0) return null;

        return (
            <div style={{ marginTop: '8px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>File Tersimpan:</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                    {urls.map((url, index) => (
                        <div key={index} style={{ fontSize: '0.8rem', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', background: '#e0f2fe', padding: '4px 8px', borderRadius: '4px' }}>
                            <span style={{ color: 'var(--primary-color)', fontWeight: 600 }}>File {index + 1}: {getFilename(url)}</span>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <a href={url.startsWith('http') ? url : `${API_BASE}${url}`} target="_blank" rel="noreferrer" style={{ color: 'var(--info)', fontWeight: 600, textDecoration: 'underline' }}>[Lihat]</a>
                                <button type="button" onClick={() => handleRemoveServerFile(url)} style={{ color: 'var(--danger)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontWeight: 600 }}>[Hapus]</button>
                            </div>
                        </div>
                    ))}
                    <button type="button" onClick={() => setDeletedFiles(prev => [...prev, fieldKey])} style={{ color: 'var(--danger)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontWeight: 600, alignSelf: 'flex-start', marginTop: '4px' }}>[Hapus Semua File {titleLabel}]</button>
                </div>
            </div>
        );
    };

    const handleRemoveServerFile = (url) => {
        setDeletedItems(prev => [...prev, url]);
        toast.info("Lampiran ditandai untuk dihapus. Simpan untuk menerapkan perubahan.");
    };

    const handleRemoveLocalFile = (setter, index) => {
        setter(prev => prev.filter((_, i) => i !== index));
    };

    useEffect(() => {
        if (isOpen) {
            setDeletedFiles([]); // Reset deletion tracking
            setDeletedItems([]);
            api.get('/satker').then(res => setSatkerList(res.data)).catch(() => { });
            api.get('/pengaturan/FIELD_WAJIB_PELANGGARAN').then(res => {
                try { setMandatoryFields(JSON.parse(res.data.value || '[]')); } catch (e) { setMandatoryFields([]); }
            }).catch(() => setMandatoryFields([]));
        }
    }, [isOpen]);

    const reinitializeForm = (data) => {
        if (isEdit && data) {
            // Parse Hukuman ke bentuk Checkbox Arrays
            let parsedDisiplin = [];
            let parsedKepp = [];
            const rawHukuman = data.hukuman || '';

            if (data.jenisSidang === 'DISIPLIN' || data.jenisSidang === 'KEPP') {
                try {
                    const parsed = JSON.parse(rawHukuman);
                    if (Array.isArray(parsed)) {
                        if (data.jenisSidang === 'DISIPLIN') parsedDisiplin = parsed;
                        if (data.jenisSidang === 'KEPP') parsedKepp = parsed;
                    }
                } catch (e) {
                    // Fallback untuk data lama yang masih plaintext
                    if (data.jenisSidang === 'DISIPLIN') parsedDisiplin = [rawHukuman];
                    if (data.jenisSidang === 'KEPP') parsedKepp = [rawHukuman];
                }
            }

            setCurrentRecord(data);
            setSelectedHukumanDisiplin(parsedDisiplin);
            setSelectedHukumanKepp(parsedKepp);

            let mappedStatus = data.statusPenyelesaian;
            if (mappedStatus === 'MENJALANI_HUKUMAN' || data.jenisSidang) mappedStatus = 'SIDANG';

            if (mappedStatus === 'TIDAK_TERBUKTI') {
                if (data.nomorSktb || data.tanggalSktb || data.fileSktbUrl) {
                    mappedStatus = 'TIDAK_TERBUKTI_SIDANG';
                } else {
                    mappedStatus = 'TIDAK_TERBUKTI_RIKSA';
                }
            } else if (mappedStatus === 'Belum ada SKTT') {
                mappedStatus = 'TIDAK_TERBUKTI_RIKSA';
            } else if (mappedStatus === 'Belum ada SKTB') {
                mappedStatus = 'TIDAK_TERBUKTI_SIDANG';
            }

            // Rekonstruksi Form
            setFormData({
                ...data,
                jenisDasar: data.jenisDasar || 'Hasil Lidik Terbukti',
                statusPenyelesaian: mappedStatus,
                tanggalSurat: data.tanggalSurat ? format(new Date(data.tanggalSurat), 'yyyy-MM-dd') : '',
                tanggalSuratSelesai: data.tanggalSuratSelesai ? format(new Date(data.tanggalSuratSelesai), 'yyyy-MM-dd') : '',
                tanggalRekomendasi: data.tanggalRekomendasi ? format(new Date(data.tanggalRekomendasi), 'yyyy-MM-dd') : '',
                nomorRekomendasi: data.nomorRekomendasi || '',
                banding: data.banding ? 'true' : 'false',
                keteranganSelesai: data.keteranganSelesai || '',
                // Hukuman diset ke raw jika bukan array based (meskipun PIDANA dihapus, jaga-jaga data lama ada)
                hukuman: (data.jenisSidang !== 'DISIPLIN' && data.jenisSidang !== 'KEPP') ? rawHukuman : '',
                nomorSkep: data.nomorSkep || '',
                tanggalSkep: data.tanggalSkep ? format(new Date(data.tanggalSkep), 'yyyy-MM-dd') : '',
                nomorSkepBanding: data.nomorSkepBanding || '',
                tanggalSkepBanding: data.tanggalSkepBanding ? format(new Date(data.tanggalSkepBanding), 'yyyy-MM-dd') : '',
                tanggalBisaAjukanRps: data.tanggalBisaAjukanRps ? format(new Date(data.tanggalBisaAjukanRps), 'yyyy-MM-dd') : '',
                pangkatSaatMelanggar: data.pangkatSaatMelanggar || targetPersonel?.pangkat || '',
                jabatanSaatMelanggar: data.jabatanSaatMelanggar || targetPersonel?.jabatan || '',
                satkerSaatMelanggar: data.satkerSaatMelanggar || targetPersonel?.satker?.nama || '',
                nomorSktt: data.nomorSktt || '',
                tanggalSktt: data.tanggalSktt ? format(new Date(data.tanggalSktt), 'yyyy-MM-dd') : '',
                nomorSp3: data.nomorSp3 || '',
                tanggalSp3: data.tanggalSp3 ? format(new Date(data.tanggalSp3), 'yyyy-MM-dd') : '',
                nomorSktb: data.nomorSktb || '',
                tanggalSktb: data.tanggalSktb ? format(new Date(data.tanggalSktb), 'yyyy-MM-dd') : ''
            });

            // Local State for Files must be EMPTY ARRAY if they are already on server
            setFileDasar([]);
            setFileSelesai([]);
            setFilePutusan([]);
            setFileRekomendasi([]);
            setFileSktt([]);
            setFileSp3([]);
            setFileSktb([]);
            setFileBanding([]);
            setDeletedFiles([]);
            setDeletedItems([]);
        } else {
            setCurrentRecord(null);
            setFormData({
                ...defaultFormState,
                personelId: targetPersonel?.id || '',
                pangkatSaatMelanggar: targetPersonel?.pangkat || '',
                jabatanSaatMelanggar: targetPersonel?.jabatan || '',
                satkerSaatMelanggar: targetPersonel?.satker?.nama || user?.satker?.nama || ''
            });
            setSelectedHukumanDisiplin([]);
            setSelectedHukumanKepp([]);
            setFileDasar([]);
            setFileSelesai([]);
            setFilePutusan([]);
            setFileRekomendasi([]);
            setFileSktt([]);
            setFileSp3([]);
            setFileSktb([]);
            setFileBanding([]);
        }
    };

    useEffect(() => {
        if (isOpen) {
            reinitializeForm(initialData);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, isEdit, initialData, targetPersonel]);

    // Helper: angka -> angka Romawi
    const toRoman = (month) => {
        const r = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
        return r[month - 1] || '';
    };

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === 'statusPenyelesaian' && isEdit && value !== formData.statusPenyelesaian) {
            setStatusChangeModal({ isOpen: true, pendingStatus: value });
            return;
        }

        applyStatusChange(name, value);
    };

    const applyStatusChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));

        // Reset state bawah ketika mengubah cabang pilihan Atas
        if (name === 'statusPenyelesaian') {
            const isSidang = value === 'SIDANG';
            const isRiksa = value === 'TIDAK_TERBUKTI_RIKSA' || value === 'Belum ada SKTT';
            const isTidSid = value === 'TIDAK_TERBUKTI_SIDANG' || value === 'Belum ada SKTB';
            const isDamai = value === 'PERDAMAIAN';

            // Jika ganti ke non-sidang, hapus atribut sidang
            if (!isSidang) {
                setFormData(prev => ({
                    ...prev,
                    jenisSidang: '', banding: 'false', nomorSkepBanding: '', tanggalSkepBanding: '', hukuman: '', tanggalBisaAjukanRps: '',
                    nomorSkep: '', tanggalSkep: '',
                    nomorRekomendasi: '', tanggalRekomendasi: ''
                }));
                setFilePutusan([]);
                setFileRekomendasi([]);
                setFileBanding([]);
            } else {
                setFormData(prev => ({ ...prev, jenisSidang: 'DISIPLIN' }));
            }

            // Jika bukan Riksa/SKTT, hapus fieldnya
            if (!isRiksa) {
                setFormData(prev => ({ ...prev, nomorSktt: '', tanggalSktt: '', nomorSp3: '', tanggalSp3: '' }));
                setFileSktt([]);
                setFileSp3([]);
            }
            // Jika bukan Tidak Terbukti Sidang/SKTB, hapus fieldnya
            if (!isTidSid) {
                setFormData(prev => ({ ...prev, nomorSktb: '', tanggalSktb: '' }));
                setFileSktb([]);
            }
            // Jika bukan Damai/Riksa/SidangTid, hapus field penyelesaian umum
            if (!isDamai && !isRiksa && !isTidSid) {
                setFormData(prev => ({ ...prev, nomorSuratSelesai: '', tanggalSuratSelesai: '', keteranganSelesai: '' }));
                setFileSelesai([]);
            }
        }
    };

    const handleConfirmStatusChange = () => {
        const newStatus = statusChangeModal.pendingStatus;

        // Mark SEMUA file penyelesaian lama untuk dihapus di server
        setDeletedFiles(prev => [
            ...prev,
            'fileSelesai', 'filePutusan', 'fileRekomendasi', 'fileSktt', 'fileSktb', 'fileSp3', 'fileBanding'
        ]);

        // Hapus SEMUA data penyelesaian sebelumnya sebelum ganti status di state local
        setFormData(prev => ({
            ...prev,
            statusPenyelesaian: newStatus,
            nomorSuratSelesai: '',
            tanggalSuratSelesai: '',
            keteranganSelesai: '',
            nomorRekomendasi: '',
            tanggalRekomendasi: '',
            jenisSidang: '',
            banding: 'false',
            nomorSkepBanding: '',
            tanggalSkepBanding: '',
            hukuman: '',
            nomorSkep: '',
            tanggalSkep: '',
            tanggalBisaAjukanRps: '',
            nomorSktt: '',
            tanggalSktt: '',
            nomorSp3: '',
            tanggalSp3: '',
            nomorSktb: '',
            tanggalSktb: ''
        }));
        setFileSelesai([]);
        setFilePutusan([]);
        setFileRekomendasi([]);
        setFileSktt([]);
        setFileSp3([]);
        setFileSktb([]);
        setFileBanding([]);

        // Jika ganti ke Sidang, set default
        if (newStatus === 'SIDANG') {
            setFormData(prev => ({ ...prev, jenisSidang: 'DISIPLIN' }));
        }

        setStatusChangeModal({ isOpen: false, pendingStatus: '' });
        toast.info("Metode penyelesaian diubah. Seluruh data & lampiran sebelumnya telah dibersihkan.");
    };

    const handleCheckboxChange = (setter, item, e) => {
        const isChecked = e.target.checked;
        setter(prev => {
            if (isChecked) return [...prev, item];
            return prev.filter(i => i !== item);
        });
    };

    const handleFileChangeLocal = (e, setter) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            setter(prev => [...prev, ...files]);
            // Clear input so same file can be selected again
            e.target.value = null;
        }
    };

    const renderLocalFiles = (files, setter) => {
        if (!files || files.length === 0) return null;
        return (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                {files.map((f, i) => (
                    <div key={i} style={{ fontSize: '0.75rem', background: '#fef3c7', padding: '2px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>{f.name}</span>
                        <button type="button" onClick={() => handleRemoveLocalFile(setter, i)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontWeight: 900 }}>×</button>
                    </div>
                ))}
            </div>
        );
    }

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            // Validasi file yang diwajibkan admin
            const missingFiles = [];
            const checkFileM = (key, stateArr, urlExist, nameStr) => {
                if (isMandatory(key)) {
                    if (stateArr.length === 0 && !(isEdit && urlExist && !deletedFiles.includes(key))) missingFiles.push(nameStr);
                }
            };

            checkFileM('fileDasar', fileDasar, currentRecord?.fileDasarUrl, 'Berkas Dasar (LHP/LP)');
            if (formData.statusPenyelesaian === 'SIDANG') {
                checkFileM('filePutusan', filePutusan, currentRecord?.filePutusanUrl, 'Berkas Putusan SKEP Hukuman');
                if (formData.banding === 'true') checkFileM('fileBanding', fileBanding, currentRecord?.fileBandingUrl, 'Berkas Lampiran SKEP Banding');
                checkFileM('fileRekomendasi', fileRekomendasi, currentRecord?.fileRekomendasiUrl, 'Berkas Rekomendasi Pemulihan');
            }
            if (formData.statusPenyelesaian === 'TIDAK_TERBUKTI_RIKSA' || formData.statusPenyelesaian === 'Belum ada SKTT') {
                checkFileM('fileSp3', fileSp3, currentRecord?.fileSp3Url, 'Berkas Lampiran SP3 / SP4');
                checkFileM('fileSktt', fileSktt, currentRecord?.fileSkttUrl, 'Berkas Surat Ket. Tidak Terbukti (SKTT)');
            }
            if (formData.statusPenyelesaian === 'TIDAK_TERBUKTI_SIDANG' || formData.statusPenyelesaian === 'Belum ada SKTB') {
                checkFileM('fileSktb', fileSktb, currentRecord?.fileSktbUrl, 'Berkas Surat Ket. Tidak Bersalah (SKTB)');
            }
            if (formData.statusPenyelesaian === 'PERDAMAIAN') {
                checkFileM('fileSelesai', fileSelesai, currentRecord?.fileSelesaiUrl, 'Berkas Penyelesaian Damai (RJ)');
            }

            if (missingFiles.length > 0) {
                toast.error(`Sistem mewajibkan lampiran berikut untuk diisi: ${missingFiles.join(', ')}`);
                return;
            }

            // Validasi: Sanksi harus dipilih minimal 1 jika status SIDANG
            if (formData.statusPenyelesaian === 'SIDANG') {
                const isDisiplinEmpty = formData.jenisSidang === 'DISIPLIN' && selectedHukumanDisiplin.length === 0;
                const isKeppEmpty = formData.jenisSidang === 'KEPP' && selectedHukumanKepp.length === 0;

                if (isDisiplinEmpty || isKeppEmpty) {
                    toast.error('Gagal simpan: Rincian vonis/sanksi hukuman harus dipilih paling tidak 1 item.');
                    return;
                }
            }

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
            } else {
                // Kosongkan atribut sidang jika tidak sidang
                payload.jenisSidang = '';
                payload.hukuman = '';
                payload.banding = 'false';
                payload.nomorSkep = '';
                payload.tanggalSkep = '';
                payload.tanggalBisaAjukanRps = '';
            }

            if (payload.statusPenyelesaian !== 'MENJALANI_HUKUMAN') {
                payload.nomorRekomendasi = '';
                payload.tanggalRekomendasi = '';
            }

            // Append Metadata for naming file later
            if (targetPersonel) {
                submitData.append('personelNama', targetPersonel.namaLengkap.replace(/[^a-z0-9]/gi, '_'));
                submitData.append('personelNrp', targetPersonel.nrpNip);
            }

            // Append Text Data
            Object.keys(payload).forEach(key => {
                // Jangan lewatkan string kosong agar backend bisa melakukan clearing
                if (payload[key] !== null) {
                    submitData.append(key, payload[key]);
                }
            });

            // Append Files (Multiple)
            fileDasar.forEach(file => submitData.append('fileDasar', file));
            fileSelesai.forEach(file => submitData.append('fileSelesai', file));
            filePutusan.forEach(file => submitData.append('filePutusan', file));
            fileRekomendasi.forEach(file => submitData.append('fileRekomendasi', file));
            fileSktt.forEach(file => submitData.append('fileSktt', file));
            fileSp3.forEach(file => submitData.append('fileSp3', file));
            fileSktb.forEach(file => submitData.append('fileSktb', file));
            fileBanding.forEach(file => submitData.append('fileBanding', file));

            // Append Deletion Flags
            submitData.append('deletedFiles', JSON.stringify(deletedFiles));
            submitData.append('deletedItems', JSON.stringify(deletedItems));

            if (isEdit) {
                await api.put(`/pelanggaran/${formData.id}`, submitData);
                toast.success('Catatan pelanggaran berhasil diperbarui.');
            } else {
                await api.post('/pelanggaran', submitData);
                toast.success('Catatan pelanggaran baru berhasil disimpan.');
            }

            refreshDashboard(); // Sync dashboard stats

            // PTDH Cek
            const hasPtdh = payload.jenisSidang === 'KEPP' && payload.hukuman && payload.hukuman.includes('PTDH');

            if (hasPtdh) {
                setShowPtdhWarning(true);
            } else {
                if (onSuccess) onSuccess();
                onClose();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Gagal menyimpan riwayat ke sistem.');
        }
    };

    const handleResetClick = (section) => {
        if (!isEdit) {
            if (section === 'sidang') {
                setFormData(prev => ({
                    ...prev,
                    jenisSidang: '',
                    hukuman: '',
                    banding: 'false',
                    nomorSkepBanding: '',
                    tanggalSkepBanding: '',
                    nomorSkep: '',
                    tanggalSkep: '',
                    tanggalBisaAjukanRps: '',
                    // Reset Rekomendasi karena tergantung Sidang
                    nomorRekomendasi: '',
                    tanggalRekomendasi: ''
                }));
                setFilePutusan([]);
                setFileRekomendasi([]);
                setFileBanding([]);
                setSelectedHukumanDisiplin([]);
                setSelectedHukumanKepp([]);
            } else if (section === 'sp3') {
                setFormData(prev => ({ ...prev, nomorSp3: '', tanggalSp3: '' }));
                setFileSp3([]);
            } else if (section === 'sktt') {
                setFormData(prev => ({ ...prev, nomorSktt: '', tanggalSktt: '' }));
                setFileSktt([]);
            } else if (section === 'sktb') {
                setFormData(prev => ({ ...prev, nomorSktb: '', tanggalSktb: '' }));
                setFileSktb([]);
            } else if (section === 'damai') {
                setFormData(prev => ({ ...prev, nomorSuratSelesai: '', tanggalSuratSelesai: '', keteranganSelesai: '' }));
                setFileSelesai([]);
            } else if (section === 'dasar_file') {
                setFileDasar([]);
            } else if (section === 'daur_ulang') {
                // Clear everything in local state (for non-edit or pre-submit)
                reinitializeForm(initialData);
                setFileRekomendasi([]);
                setFormData(prev => ({ ...prev, nomorRekomendasi: null, tanggalRekomendasi: null }));
            } else {
                setFormData(prev => ({ ...prev, nomorRekomendasi: '', tanggalRekomendasi: '' }));
                setFileRekomendasi([]);
            }
            toast.success(`Data ${section.toUpperCase()} dibersihkan.`);
            return;
        }
        setResetModal({ isOpen: true, section, alasan: '' });
    };

    const confirmResetSection = async () => {
        if (!resetModal.alasan.trim()) {
            toast.error('Alasan wajib diisi.');
            return;
        }

        try {
            await api.post(`/pelanggaran/reset-section/${formData.id}`, {
                section: resetModal.section,
                alasan: resetModal.alasan
            });

            // Re-fetch record untuk refresh tampilan modal (sync dengan DB)
            const res = await api.get(`/pelanggaran/${formData.id}`);
            reinitializeForm(res.data);

            toast.success(`Data ${resetModal.section === 'sidang' ? 'Sidang' : 'Rekomendasi'} berhasil dikosongkan.`);
            setResetModal({ isOpen: false, section: '', alasan: '' });
            if (onSuccess) onSuccess();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Gagal mereset data.');
        }
    };

    const today = new Date().toISOString().split('T')[0];

    // Gunakan tanggal awal (initialData) sebagai pembanding agar tidak langsung terbuka otomatis saat input diubah
    const compareDate = (isEdit && initialData?.tanggalBisaAjukanRps)
        ? format(new Date(initialData.tanggalBisaAjukanRps), 'yyyy-MM-dd')
        : formData.tanggalBisaAjukanRps;

    const isRekomendasiLocked = formData.statusPenyelesaian === 'SIDANG' && compareDate && today < compareDate;
    const isRekomendasiFilled = !!(formData.nomorRekomendasi || formData.tanggalRekomendasi || (fileRekomendasi && fileRekomendasi.length > 0) || (isEdit && initialData?.fileRekomendasiUrl && !deletedFiles.includes('fileRekomendasi')));

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? "Revisi Catatan Pelanggaran" : "Entri Catatan Pelanggaran Baru"}>
            <form onSubmit={handleSubmit} style={{ minWidth: '700px', maxHeight: '80vh', overflowY: 'auto', paddingRight: '1rem' }}>

                {targetPersonel && (
                    <div style={{ background: 'var(--primary-color)', color: 'white', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>Target Personel:</div>
                            <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{targetPersonel.namaLengkap} ({targetPersonel.nrpNip})</div>
                            <div style={{ fontSize: '0.9rem' }}>{targetPersonel.pangkat} - {targetPersonel.jabatan}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>Status Keaktifan:</div>
                            <div style={{
                                background: targetPersonel.statusKeaktifan?.includes('PTDH') ? 'var(--danger)' : 'var(--success)',
                                color: 'white',
                                padding: '4px 12px',
                                borderRadius: '20px',
                                fontWeight: 700,
                                fontSize: '0.9rem',
                                marginTop: '4px',
                                display: 'inline-block',
                                border: '2px solid white'
                            }}>
                                {targetPersonel.statusKeaktifan || 'AKTIF'}
                            </div>
                        </div>
                    </div>
                )}

                {currentRecord?.catatanRevisi && (
                    <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#fff5f5', border: '1px solid #feb2b2', borderRadius: '8px', color: '#c53030', fontSize: '0.9rem' }}>
                        <strong style={{ display: 'block', marginBottom: '4px', fontSize: '1rem' }}>⚠️ Instruksi Perbaikan dari Admin:</strong>
                        {currentRecord.catatanRevisi}
                    </div>
                )}

                {/* 1. DASAR CATPERS */}
                <fieldset className="form-section">
                    <legend>1. Dasar Dimulainya Catpers</legend>

                    <div className="form-group">
                        <label>Wujud Perbuatan Pelanggaran (Deskripsi Kasus) <span style={{ color: 'var(--danger)' }}>*</span></label>
                        <textarea className="form-input" name="wujudPerbuatan" value={formData.wujudPerbuatan} onChange={handleChange} rows={2} required placeholder="Gambarkan pelanggaran yang dilakukan..."></textarea>
                    </div>

                    {/* Row 1: Pangkat + Jabatan + Satker saat melanggar */}
                    <div className="flex gap-4">
                        <div className="form-group w-full">
                            <label>Pangkat Saat Melanggar {renderAsterisk('pangkatSaatMelanggar')}</label>
                            <select className="form-input" name="pangkatSaatMelanggar" value={formData.pangkatSaatMelanggar || ''} onChange={handleChange} required={isMandatory('pangkatSaatMelanggar')}>
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
                            <label>Jabatan Saat Melanggar {renderAsterisk('jabatanSaatMelanggar')}</label>
                            <input type="text" className="form-input" name="jabatanSaatMelanggar" value={formData.jabatanSaatMelanggar || ''} onChange={handleChange} required={isMandatory('jabatanSaatMelanggar')} placeholder="Jabatan saat kejadian..." />
                        </div>
                        <div className="form-group w-full">
                            <label>Satker Saat Melanggar {renderAsterisk('satkerSaatMelanggar')}</label>
                            <select className="form-input" name="satkerSaatMelanggar" value={formData.satkerSaatMelanggar || ''} onChange={handleChange} required={isMandatory('satkerSaatMelanggar')} disabled={user?.role === 'OPERATOR_SATKER'}>
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
                            <DatePicker
                                locale={id}
                                dateFormat="d MMMM yyyy"
                                className="form-input w-full"
                                selected={formData.tanggalSurat ? new Date(formData.tanggalSurat) : null}
                                onChange={(date) => handleChange({ target: { name: 'tanggalSurat', value: date ? format(date, 'yyyy-MM-dd') : '' } })}
                                placeholderText="Pilih Tanggal"
                                required
                            />
                        </div>
                    </div>

                    {/* Row 3: Nomor Surat (auto-format) */}
                    <div className="form-group">
                        <label>Nomor Surat Dasar <span style={{ color: 'var(--danger)' }}>*</span></label>
                        <input
                            type="text"
                            className="form-input"
                            name="nomorSurat"
                            value={formData.nomorSurat}
                            onChange={handleChange}
                            required
                            placeholder="Contoh: R/LHP-01/IV/HUK.12.10./2025/Paminal"
                        />
                    </div>

                    {/* Row 4: Upload Berkas + Keterangan */}
                    <div className="flex gap-4">
                        <div className="form-group w-full">
                            <label>Unggah Berkas Dasar (PDF/IMG, Max 5MB) {renderAsterisk('fileDasar')}</label>
                            <input type="file" multiple className="form-input" accept=".pdf,image/*" onChange={(e) => handleFileChangeLocal(e, setFileDasar)} />
                            {renderLocalFiles(fileDasar, setFileDasar)}
                            {isEdit && currentRecord?.fileDasarUrl && renderServerFiles(currentRecord.fileDasarUrl, 'fileDasar', 'Dasar')}
                        </div>
                        <div className="form-group w-full">
                            <label>Keterangan Dasar {isMandatory('keteranganDasar') ? null : "(Opsional)"} {renderAsterisk('keteranganDasar')}</label>
                            <input type="text" className="form-input" name="keteranganDasar" value={formData.keteranganDasar || ''} onChange={handleChange} required={isMandatory('keteranganDasar')} />
                        </div>
                    </div>
                </fieldset>


                {/* 2. PENYELESAIAN */}
                <fieldset className="form-section">
                    <legend>2. Alur Penyelesaian</legend>

                    <div className="form-group">
                        <label>Pilih Metode Penyelesaian Terakhir</label>
                        <select className="form-input" name="statusPenyelesaian" value={formData.statusPenyelesaian} onChange={handleChange} style={{ border: '2px solid var(--primary-color)', fontWeight: 600 }} required>
                            <option value="PROSES">DALAM PROSES (Belum Sidang / Menunggu Putusan)</option>
                            <option value="PERDAMAIAN">PERDAMAIAN (Form Perdamaian)</option>
                            <option value="TIDAK_TERBUKTI_RIKSA">TIDAK TERBUKTI RIKSA PROVOS/WABPROF</option>
                            <option value="TIDAK_TERBUKTI_SIDANG">TIDAK TERBUKTI SIDANG</option>
                            <option value="SIDANG">PROSES SIDANG</option>
                        </select>
                    </div>

                    {['PERDAMAIAN', 'TIDAK_TERBUKTI_RIKSA', 'TIDAK_TERBUKTI_SIDANG'].includes(formData.statusPenyelesaian) ? (
                        <div style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '8px', border: '1px dashed var(--success)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h4 style={{ color: 'var(--success)', margin: 0 }}>
                                    {formData.statusPenyelesaian === 'PERDAMAIAN' ? 'Formulir Resolusi Damai / Restorative Justice' :
                                        formData.statusPenyelesaian === 'TIDAK_TERBUKTI_RIKSA' ? 'Formulir SP3 / SP4 & SKTT' :
                                            'Formulir Surat Keterangan Tidak Bersalah (SKTB)'}
                                </h4>
                                <button type="button" onClick={() => handleResetClick(formData.statusPenyelesaian === 'PERDAMAIAN' ? 'damai' : (formData.statusPenyelesaian === 'TIDAK_TERBUKTI_RIKSA' ? 'sp3' : 'sktb'))} style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: '0.7rem', fontWeight: 700, padding: '4px 10px', borderRadius: '4px' }}>
                                    <RotateCcw size={12} style={{ marginRight: '4px' }} /> RESET DATA
                                </button>
                            </div>

                            {formData.statusPenyelesaian === 'PERDAMAIAN' && (
                                <>
                                    <div className="flex gap-4">
                                        <div className="form-group w-full">
                                            <label>No. Surat Penyelesaian / Ketetapan</label>
                                            <input type="text" className="form-input" name="nomorSuratSelesai" value={formData.nomorSuratSelesai || ''} onChange={handleChange} required />
                                        </div>
                                        <div className="form-group w-full">
                                            <label>Tanggal Surat Selesai</label>
                                            <DatePicker
                                                locale={id}
                                                dateFormat="d MMMM yyyy"
                                                className="form-input w-full"
                                                selected={formData.tanggalSuratSelesai ? new Date(formData.tanggalSuratSelesai) : null}
                                                onChange={(date) => handleChange({ target: { name: 'tanggalSuratSelesai', value: date ? format(date, 'yyyy-MM-dd') : '' } })}
                                                placeholderText="Pilih Tanggal"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Keterangan Penyelesaian (Bagaimana Kasus Diakhiri?)</label>
                                        <textarea className="form-input" name="keteranganSelesai" value={formData.keteranganSelesai || ''} onChange={handleChange} rows={2} required></textarea>
                                    </div>
                                    <div className="form-group mb-0">
                                        <label>Unggah SP3/SP4/Bukti Damai {renderAsterisk('fileSelesai')}</label>
                                        <input type="file" multiple className="form-input" accept=".pdf,image/*" onChange={(e) => handleFileChangeLocal(e, setFileSelesai)} />
                                        {renderLocalFiles(fileSelesai, setFileSelesai)}
                                        {isEdit && currentRecord?.fileSelesaiUrl && renderServerFiles(currentRecord.fileSelesaiUrl, 'fileSelesai', 'Selesai')}
                                    </div>
                                </>
                            )}

                            {/* SP3 / SP4 SECTION */}
                            {(formData.statusPenyelesaian === 'TIDAK_TERBUKTI_RIKSA' || formData.statusPenyelesaian === 'Belum ada SKTT') && (
                                <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem' }}>
                                    <h4 style={{ color: 'var(--primary-color)', marginTop: 0, marginBottom: '1rem' }}>Formulir Surat Perintah Penghentian Penyelidikan/Penyidikan (SP3/SP4)</h4>
                                    <div className="flex gap-4">
                                        <div className="form-group w-full">
                                            <label>No. SP3 / SP4 <span style={{ color: 'var(--danger)' }}>*</span></label>
                                            <input type="text" className="form-input" name="nomorSp3" value={formData.nomorSp3 || ''} onChange={handleChange} placeholder="No. SP3 atau SP4..." required />
                                        </div>
                                        <div className="form-group w-full">
                                            <label>Tanggal SP3 / SP4 <span style={{ color: 'var(--danger)' }}>*</span></label>
                                            <DatePicker
                                                locale={id}
                                                dateFormat="d MMMM yyyy"
                                                className="form-input w-full"
                                                selected={formData.tanggalSp3 ? new Date(formData.tanggalSp3) : null}
                                                onChange={(date) => handleChange({ target: { name: 'tanggalSp3', value: date ? format(date, 'yyyy-MM-dd') : '' } })}
                                                placeholderText="Pilih Tanggal"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group mb-0">
                                        <label>Unggah SP3 / SP4 {renderAsterisk('fileSp3')}</label>
                                        <input type="file" multiple className="form-input" accept=".pdf,image/*" onChange={(e) => handleFileChangeLocal(e, setFileSp3)} />
                                        {renderLocalFiles(fileSp3, setFileSp3)}
                                        {isEdit && currentRecord?.fileSp3Url && renderServerFiles(currentRecord.fileSp3Url, 'fileSp3', 'SP3/SP4')}
                                    </div>
                                </div>
                            )}

                            {/* SKTT SECTION */}
                            {(formData.statusPenyelesaian === 'TIDAK_TERBUKTI_RIKSA' || formData.statusPenyelesaian === 'Belum ada SKTT') && (
                                <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px dashed var(--border)', opacity: (!formData.nomorSp3 || !formData.tanggalSp3) ? 0.6 : 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                        <h4 style={{ color: 'var(--primary-color)', margin: 0 }}>Formulir Surat Keterangan Tidak Terbukti (SKTT)</h4>
                                        {(formData.nomorSktt || formData.tanggalSktt || fileSktt.length > 0) && (
                                            <button type="button" onClick={() => handleResetClick('sktt')} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: '0.7rem', fontWeight: 600 }}>
                                                <RotateCcw size={12} style={{ marginRight: '4px' }} /> RESET SKTT
                                            </button>
                                        )}
                                    </div>
                                    {(!formData.nomorSp3 || !formData.tanggalSp3) && (
                                        <div style={{ marginBottom: '1rem', padding: '0.5rem', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '4px', fontSize: '0.8rem', color: '#92400e' }}>
                                            SKTT hanya dapat diisi setalah data SP3 / SP4 dilengkapi.
                                        </div>
                                    )}
                                    <div className="flex gap-4">
                                        <div className="form-group w-full">
                                            <label>No. SKTT <span style={{ color: 'var(--danger)' }}>*</span></label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                name="nomorSktt"
                                                value={formData.nomorSktt || ''}
                                                onChange={handleChange}
                                                placeholder="No. SKTT..."
                                                disabled={!formData.nomorSp3 || !formData.tanggalSp3}
                                            />
                                        </div>
                                        <div className="form-group w-full">
                                            <label>Tanggal SKTT <span style={{ color: 'var(--danger)' }}>*</span></label>
                                            <DatePicker
                                                locale={id}
                                                dateFormat="d MMMM yyyy"
                                                className="form-input w-full"
                                                selected={formData.tanggalSktt ? new Date(formData.tanggalSktt) : null}
                                                onChange={(date) => handleChange({ target: { name: 'tanggalSktt', value: date ? format(date, 'yyyy-MM-dd') : '' } })}
                                                placeholderText="Pilih Tanggal"
                                                disabled={!formData.nomorSp3 || !formData.tanggalSp3}
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Unggah SKTT {renderAsterisk('fileSktt')}</label>
                                        <input
                                            type="file"
                                            multiple
                                            className="form-input"
                                            accept=".pdf,image/*"
                                            onChange={(e) => handleFileChangeLocal(e, setFileSktt)}
                                            disabled={!formData.nomorSp3 || !formData.tanggalSp3}
                                        />
                                        {renderLocalFiles(fileSktt, setFileSktt)}
                                        {isEdit && currentRecord?.fileSkttUrl && renderServerFiles(currentRecord.fileSkttUrl, 'fileSktt', 'SKTT')}
                                    </div>
                                </div>
                            )}

                            {/* SKTB SECTION */}
                            {(formData.statusPenyelesaian === 'TIDAK_TERBUKTI_SIDANG' || formData.statusPenyelesaian === 'Belum ada SKTB') && (
                                <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                                    <h4 style={{ color: 'var(--primary-color)', marginTop: 0, marginBottom: '1rem' }}>Formulir Surat Keterangan Tidak Bersalah (SKTB)</h4>
                                    <div className="flex gap-4">
                                        <div className="form-group w-full">
                                            <label>No. SKTB <span style={{ color: 'var(--danger)' }}>*</span></label>
                                            <input type="text" className="form-input" name="nomorSktb" value={formData.nomorSktb || ''} onChange={handleChange} placeholder="No. SKTB..." />
                                        </div>
                                        <div className="form-group w-full">
                                            <label>Tanggal SKTB <span style={{ color: 'var(--danger)' }}>*</span></label>
                                            <DatePicker
                                                locale={id}
                                                dateFormat="d MMMM yyyy"
                                                className="form-input w-full"
                                                selected={formData.tanggalSktb ? new Date(formData.tanggalSktb) : null}
                                                onChange={(date) => handleChange({ target: { name: 'tanggalSktb', value: date ? format(date, 'yyyy-MM-dd') : '' } })}
                                                placeholderText="Pilih Tanggal"
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Unggah SKTB {renderAsterisk('fileSktb')}</label>
                                        <input type="file" multiple className="form-input" accept=".pdf,image/*" onChange={(e) => handleFileChangeLocal(e, setFileSktb)} />
                                        {renderLocalFiles(fileSktb, setFileSktb)}
                                        {isEdit && currentRecord?.fileSktbUrl && renderServerFiles(currentRecord.fileSktbUrl, 'fileSktb', 'SKTB')}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : null}
                </fieldset>

                {/* 3. PROSES SIDANG (Hanya Muncul Jika Pilih SIDANG) */}
                {formData.statusPenyelesaian === 'SIDANG' && (
                    <fieldset style={{ border: '2px solid var(--warning)', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem', background: '#fffbeb', position: 'relative' }}>
                        <legend style={{ padding: '0 0.75rem', fontWeight: 700, color: 'var(--warning)', fontSize: '1.05rem', background: 'white', border: '1px solid var(--warning)', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            3. Rekam Putusan Sidang & Sanksi
                            {(formData.jenisSidang || (isEdit && currentRecord?.jenisSidang)) && (
                                <button type="button" onClick={() => handleResetClick('sidang')} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: '0.75rem', fontWeight: 600, padding: '2px 8px', borderRadius: '4px' }} title="Kosongkan Bagian Ini">
                                    <RotateCcw size={12} style={{ marginRight: '4px' }} /> RESET
                                </button>
                            )}
                        </legend>

                        <div className="flex gap-4">
                            <div className="form-group w-full">
                                <label>Jenis Peradilan/Sidang <span style={{ color: 'var(--danger)' }}>*</span></label>
                                <select className="form-input" name="jenisSidang" value={formData.jenisSidang || ''} onChange={handleChange} style={{ fontWeight: 600 }} required>
                                    <option value="DISIPLIN">Sidang DISIPLIN</option>
                                    <option value="KEPP">Sidang Kode Etik (KKEPP)</option>
                                </select>
                            </div>
                            <div className="form-group w-full">
                                <label>Status Banding Terduga Pelanggar<span style={{ color: 'var(--danger)' }}>*</span></label>
                                <select className="form-input" name="banding" value={formData.banding} onChange={handleChange} required>
                                    <option value="false">Tidak Mengajukan Banding (Inkracht)</option>
                                    <option value="true">Mengajukan Banding</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-4 mb-4">
                            <div className="form-group w-full">
                                <label>Nomor SKEP Hukuman <span style={{ color: 'var(--danger)' }}>*</span></label>
                                <input type="text" className="form-input" name="nomorSkep" value={formData.nomorSkep || ''} onChange={handleChange} required />
                            </div>
                            <div className="form-group w-full">
                                <label>Tanggal SKEP Hukuman <span style={{ color: 'var(--danger)' }}>*</span></label>
                                <DatePicker
                                    locale={id}
                                    dateFormat="d MMMM yyyy"
                                    className="form-input w-full"
                                    selected={formData.tanggalSkep ? new Date(formData.tanggalSkep) : null}
                                    onChange={(date) => handleChange({ target: { name: 'tanggalSkep', value: date ? format(date, 'yyyy-MM-dd') : '' } })}
                                    placeholderText="Pilih Tanggal"
                                    required
                                />
                            </div>
                        </div>

                        {formData.banding === 'true' && (
                            <div className="flex gap-4 mb-4 p-4 rounded" style={{ background: '#e0f2fe', border: '1px solid #bae6fd' }}>
                                <div className="form-group w-full mb-0">
                                    <label>Nomor SKEP Banding <span style={{ color: 'var(--danger)' }}>*</span></label>
                                    <input type="text" className="form-input" name="nomorSkepBanding" value={formData.nomorSkepBanding || ''} onChange={handleChange} required />
                                </div>
                                <div className="form-group w-full mb-0">
                                    <label>Tanggal SKEP Banding <span style={{ color: 'var(--danger)' }}>*</span></label>
                                    <DatePicker
                                        locale={id}
                                        dateFormat="d MMMM yyyy"
                                        className="form-input w-full"
                                        selected={formData.tanggalSkepBanding ? new Date(formData.tanggalSkepBanding) : null}
                                        onChange={(date) => handleChange({ target: { name: 'tanggalSkepBanding', value: date ? format(date, 'yyyy-MM-dd') : '' } })}
                                        placeholderText="Pilih Tanggal"
                                        required
                                    />
                                </div>
                                <div className="form-group w-full mb-0">
                                    <label>Berkas SKEP Banding {renderAsterisk('fileBanding')}</label>
                                    <input type="file" multiple className="form-input" accept=".pdf,image/*" onChange={(e) => handleFileChangeLocal(e, setFileBanding)} />
                                    {renderLocalFiles(fileBanding, setFileBanding)}
                                    {isEdit && currentRecord?.fileBandingUrl && renderServerFiles(currentRecord.fileBandingUrl, 'fileBanding', 'Banding')}
                                </div>
                            </div>
                        )}

                        <div className="form-group mb-4">
                            <label>Saran Tanggal Bisa Mengajukan Rekomendasi <span style={{ color: 'var(--danger)' }}>*</span></label>
                            <div style={{ border: '1px solid var(--info)', borderRadius: '6px', overflow: 'hidden' }}>
                                <DatePicker
                                    locale={id}
                                    dateFormat="d MMMM yyyy"
                                    className="form-input w-full border-0 rounded-none m-0"
                                    selected={formData.tanggalBisaAjukanRps ? new Date(formData.tanggalBisaAjukanRps) : null}
                                    onChange={(date) => handleChange({ target: { name: 'tanggalBisaAjukanRps', value: date ? format(date, 'yyyy-MM-dd') : '' } })}
                                    placeholderText="Pilih Tanggal"
                                    required
                                />
                            </div>
                            <small style={{ color: 'var(--text-muted)' }}>* Form Penginputan Rekomendasi (Bagian 4) akan ditutup sampai tanggal ini terlewati.</small>
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
                        </div>

                        <div className="form-group mb-0">
                            <label>Unggah Salinan SKEP Hukuman (PDF/IMG, Max 5MB) {renderAsterisk('filePutusan')}</label>
                            <input type="file" multiple className="form-input" accept=".pdf,image/*" onChange={(e) => handleFileChangeLocal(e, setFilePutusan)} />
                            {renderLocalFiles(filePutusan, setFilePutusan)}
                            {isEdit && currentRecord?.filePutusanUrl && renderServerFiles(currentRecord.filePutusanUrl, 'filePutusan', 'Putusan')}
                        </div>

                    </fieldset>
                )}


                {/* 4. DETAIL REKOMENDASI */}
                {formData.statusPenyelesaian === 'SIDANG' && (
                    <fieldset style={{ border: `2px solid ${isRekomendasiLocked ? '#cbd5e1' : 'var(--info)'}`, borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem', background: isRekomendasiLocked ? '#f8fafc' : '#eff6ff', opacity: isRekomendasiLocked ? 0.7 : 1, position: 'relative' }}>
                        <legend style={{ padding: '0 0.75rem', fontWeight: 700, color: isRekomendasiLocked ? '#64748b' : 'var(--info)', fontSize: '1.05rem', background: 'white', border: `1px solid ${isRekomendasiLocked ? '#cbd5e1' : 'var(--info)'}`, borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            4. Detail Pemulihan Status (Rekomendasi)
                            {!isRekomendasiLocked && (
                                <button type="button" onClick={() => handleResetClick('rekomendasi')} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: '0.7rem', fontWeight: 600 }}>
                                    <RotateCcw size={12} style={{ marginRight: '4px' }} /> RESET REKOMENDASI
                                </button>
                            )}
                        </legend>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem', marginTop: '-0.5rem' }}>
                            Wajib diisi jika Personel telah melewati masa hukuman dan mendapatkan surat Rekomendasi Pemulihan Status.
                        </p>

                        {isRekomendasiLocked && (
                            <div style={{ background: '#fff3cd', color: '#856404', padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.9rem', border: '1px solid #ffeeba' }}>
                                <strong>&#9888; Pengajuan Rekomendasi Terkunci.</strong><br />
                                Personel masih dalam masa hukuman dan hanya bisa mengajukan rekomendasi setelah tanggal <strong>{formData.tanggalBisaAjukanRps ? format(new Date(formData.tanggalBisaAjukanRps), 'dd/MM/yyyy') : '-'}</strong>.
                            </div>
                        )}

                        <div className="flex gap-4">
                            <div className="form-group w-full">
                                <label>Nomor Surat Rekomendasi {isRekomendasiFilled && <span style={{ color: 'var(--danger)' }}>*</span>}</label>
                                <input type="text" className="form-input" name="nomorRekomendasi" value={formData.nomorRekomendasi || ''} onChange={handleChange} placeholder="Masukkan nomor surat rekomendasi" disabled={isRekomendasiLocked} required={isRekomendasiFilled && !isRekomendasiLocked} />
                            </div>
                            <div className="form-group w-full">
                                <label>Tanggal Surat Rekomendasi {isRekomendasiFilled && <span style={{ color: 'var(--danger)' }}>*</span>}</label>
                                <DatePicker
                                    locale={id}
                                    dateFormat="d MMMM yyyy"
                                    className="form-input w-full"
                                    selected={formData.tanggalRekomendasi ? new Date(formData.tanggalRekomendasi) : null}
                                    onChange={(date) => handleChange({ target: { name: 'tanggalRekomendasi', value: date ? format(date, 'yyyy-MM-dd') : '' } })}
                                    placeholderText="Pilih Tanggal"
                                    disabled={isRekomendasiLocked}
                                    required={isRekomendasiFilled && !isRekomendasiLocked}
                                />
                            </div>
                        </div>

                        <div className="form-group mb-0">
                            <label>Unggah Berkas Rekomendasi (PDF/IMG) {renderAsterisk('fileRekomendasi')}</label>
                            <input type="file" multiple className="form-input" accept=".pdf,image/*" onChange={(e) => handleFileChangeLocal(e, setFileRekomendasi)} disabled={isRekomendasiLocked} />
                            {isEdit && currentRecord?.fileRekomendasiUrl && !deletedFiles.includes('fileRekomendasi') && (
                                <div style={{ fontSize: '0.8rem', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginTop: '4px', background: '#dbeafe', padding: '4px 8px', borderRadius: '4px' }}>
                                    <span style={{ color: 'var(--info)', fontWeight: 600 }}>File: {getFilename(currentRecord.fileRekomendasiUrl)}</span>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <a href={currentRecord.fileRekomendasiUrl.startsWith('http') ? currentRecord.fileRekomendasiUrl : `${API_BASE}${currentRecord.fileRekomendasiUrl}`} target="_blank" rel="noreferrer" style={{ color: 'var(--info)', fontWeight: 600, textDecoration: 'underline' }}>[Lihat]</a>
                                        {user?.role === 'ADMIN_POLDA' && (
                                            <button type="button" onClick={() => setDeletedFiles(prev => [...prev, 'fileRekomendasi'])} style={{ color: 'var(--danger)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontWeight: 600 }}>[Hapus]</button>
                                        )}
                                    </div>
                                </div>
                            )}
                            {deletedFiles.includes('fileRekomendasi') && <div style={{ fontSize: '0.8rem', color: 'var(--danger)', marginTop: '4px' }}>File akan dihapus setelah disimpan.</div>}
                        </div>
                    </fieldset>
                )}


                <div className="form-actions" style={{ position: 'sticky', bottom: 0, background: 'var(--bg-color)', padding: '1rem 0', borderTop: '1px solid var(--border)' }}>
                    <button type="button" className="btn-secondary" onClick={onClose} style={{ padding: '0.75rem 1.5rem' }}>Batalkan</button>
                    <button type="submit" className="btn-primary" style={{ padding: '0.75rem 2rem' }}>&#10004; {isEdit ? "Simpan Perubahan Catatan" : "Tambah ke Riwayat"}</button>
                </div>
            </form>

            {/* Dialog Konfirmasi Reset */}
            <Modal isOpen={resetModal.isOpen} onClose={() => setResetModal({ ...resetModal, isOpen: false })} title={`Konfirmasi Kosongkan Data ${resetModal.section === 'sidang' ? 'Sidang' : 'Rekomendasi'}`}>
                <div style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>
                    Anda akan menghapus seluruh data pada bagian <strong>{resetModal.section === 'sidang' ? '3. Rekam Putusan Sidang & Sanksi' : '4. Detail Pemulihan Status'}</strong>.
                    {resetModal.section === 'sidang' && (
                        <div style={{ marginTop: '0.5rem', color: 'var(--danger)', fontWeight: 600 }}>
                            ⚠️ PERHATIAN: Menghapus data Sidang juga akan otomatis menghapus data pada bagian 4. Detail Pemulihan Status (Rekomendasi).
                        </div>
                    )}
                    <div style={{ marginTop: '0.5rem' }}>Tindakan ini permanen dan akan dicatat di log audit.</div>
                </div>

                <div className="form-group w-full relative">
                    <label style={{ color: 'var(--danger)', fontWeight: 'bold' }}>Alasan Reset (Wajib Audit Log) *</label>
                    <textarea
                        className="form-input"
                        rows="3"
                        value={resetModal.alasan}
                        onChange={(e) => setResetModal({ ...resetModal, alasan: e.target.value })}
                        placeholder="Contoh: Kesalahan input data sidang, Revisi total berkas rekomendasi..."
                        autoFocus
                    ></textarea>
                </div>

                <div className="form-actions mt-4">
                    <button type="button" className="btn-secondary" onClick={() => setResetModal({ ...resetModal, isOpen: false })}>Batal</button>
                    <button type="button" onClick={confirmResetSection} className="btn-primary" style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }} disabled={!resetModal.alasan.trim()}>
                        <Trash2 size={16} /> Ya, Kosongkan Data
                    </button>
                </div>
            </Modal>

            <Modal isOpen={statusChangeModal.isOpen} onClose={() => setStatusChangeModal({ isOpen: false, pendingStatus: '' })} title="Peringatan: Ubah Metode Penyelesaian">
                <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ background: '#fff5f5', color: '#c53030', padding: '1rem', borderRadius: '8px', border: '1px solid #feb2b2', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                            <AlertCircle size={20} />
                            <strong>Perhatian!</strong>
                        </div>
                        Mengubah metode penyelesaian akan menghapus seluruh data yang telah diinput pada cabang penyelesaian sebelumnya (seperti data Sidang, SKTT, atau SKTB).
                    </div>
                    Tindakan ini tidak dapat dibatalkan. Apakah Anda yakin ingin melanjutkan perubahan ke <strong>{statusChangeModal.pendingStatus}</strong>?
                </div>

                <div className="form-actions mt-4">
                    <button type="button" className="btn-secondary" onClick={() => setStatusChangeModal({ isOpen: false, pendingStatus: '' })}>Batal</button>
                    <button type="button" onClick={handleConfirmStatusChange} className="btn-primary" style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }}>
                        <CheckCircle size={16} /> Ya, Lanjutkan & Kosongkan Data
                    </button>
                </div>
            </Modal>
            <Modal isOpen={showPtdhWarning} onClose={() => { setShowPtdhWarning(false); if (onSuccess) onSuccess(); onClose(); }} title="Pemberitahuan: Sanksi PTDH">
                <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                    <div style={{ background: '#fff5f5', color: '#c53030', padding: '1.5rem', borderRadius: '8px', border: '1px solid #feb2b2', marginBottom: '1rem' }}>
                        <AlertCircle size={48} style={{ margin: '0 auto 10px', color: '#e53e3e' }} />
                        <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2rem', fontWeight: 800 }}>PERSONEL DIBERHENTIKAN</h3>
                        <p style={{ marginTop: '0.5rem', fontSize: '0.95rem' }}>Sanksi PTDH (Pemberhentian Tidak Dengan Hormat) telah diberikan kepada personel ini.</p>
                        <p style={{ fontSize: '0.95rem', background: 'white', padding: '8px', borderRadius: '4px', marginTop: '10px' }}>Otomatisasi Sistem: Status personel telah diubah menjadi <strong style={{ color: 'var(--danger)' }}>TIDAK AKTIF (PTDH)</strong>.</p>
                    </div>
                </div>

                <div className="form-actions mt-4" style={{ justifyContent: 'center', gap: '1rem' }}>
                    <button type="button" onClick={() => { setShowPtdhWarning(false); if (onSuccess) onSuccess(); onClose(); }} className="btn-primary" style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }}>
                        <CheckCircle size={16} /> Mengerti
                    </button>
                    <button type="button" onClick={() => setShowPtdhWarning(false)} className="btn-secondary">
                        Tinjau Kembali
                    </button>
                </div>
            </Modal>
        </Modal>
    );
};

export default PelanggaranFormModal;
