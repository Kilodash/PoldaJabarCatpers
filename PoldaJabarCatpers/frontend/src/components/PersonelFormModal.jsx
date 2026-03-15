import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDashboard } from '../context/DashboardContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import api from '../utils/api';
import Modal from './Modal';

const pangkatPolri = ["Bharada", "Bharatu", "Bharaka", "Abripda", "Abriptu", "Abrip", "Bripda", "Briptu", "Brigadir", "Bripka", "Aipda", "Aiptu", "Ipda", "Iptu", "AKP", "Kompol", "AKBP", "Kombes Pol", "Brigjen Pol", "Irjen Pol", "Komjen Pol", "Jenderal Pol"];
const pangkatPns = ["Pengatur Muda (II/a)", "Pengatur Muda Tk. I (II/b)", "Pengatur (II/c)", "Pengatur Tk. I (II/d)", "Penata Muda (III/a)", "Penata Muda Tk. I (III/b)", "Penata (III/c)", "Penata Tk. I (III/d)", "Pembina (IV/a)", "Pembina Tk. I (IV/b)", "Pembina Utama Muda (IV/c)", "Pembina Utama Madya (IV/d)", "Pembina Utama (IV/e)"];

const PersonelFormModal = ({ isOpen, onClose, onSuccess, isEdit = false, initialData = null }) => {
    const { user } = useAuth();
    const { refresh: refreshDashboard } = useDashboard();
    const [satkerList, setSatkerList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [appSettings, setAppSettings] = useState({
        PANJANG_NRP_POLRI: 8, PANJANG_NIP_PNS: 18,
        USIA_MINIMAL_POLRI: 18, USIA_MINIMAL_PNS: 18,
        USIA_PENSIUN_POLRI: 58, USIA_PENSIUN_PNS: 58
    });

    const [nrpStatus, setNrpStatus] = useState({ isValid: true, message: '' });
    const [typingTimeout, setTypingTimeout] = useState(0);
    const [formData, setFormData] = useState({
        id: '',
        jenisPegawai: 'POLRI',
        nrpNip: '',
        namaLengkap: '',
        pangkat: '',
        jabatan: '',
        satkerId: '',
        tanggalLahir: ''
    });

    useEffect(() => {
        if (isOpen) {
            fetchDependencies();
            if (isEdit && initialData) {
                setFormData({
                    id: initialData.id,
                    jenisPegawai: initialData.jenisPegawai,
                    nrpNip: initialData.nrpNip,
                    namaLengkap: initialData.namaLengkap,
                    pangkat: initialData.pangkat,
                    jabatan: initialData.jabatan,
                    satkerId: initialData.satkerId ? initialData.satkerId.toString() : '',
                    tanggalLahir: initialData.tanggalLahir ? format(new Date(initialData.tanggalLahir), 'yyyy-MM-dd') : ''
                });
                setNrpStatus({ isValid: true, message: '' });
            } else {
                setFormData({
                    id: '',
                    jenisPegawai: 'POLRI',
                    nrpNip: '',
                    namaLengkap: '',
                    pangkat: '',
                    jabatan: '',
                    satkerId: user?.satker?.id ? user.satker.id.toString() : '',
                    tanggalLahir: ''
                });
                setNrpStatus({ isValid: true, message: '' });
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, isEdit, initialData, user]);

    const fetchDependencies = async () => {
        try {
            setLoading(true);
            const [resSatker, resSettings] = await Promise.all([
                api.get('/satker'),
                api.get('/pengaturan')
            ]);
            setSatkerList(resSatker.data);

            const settMap = {};
            resSettings.data.forEach(s => { settMap[s.key] = parseInt(s.value) });
            setAppSettings(prev => ({ ...prev, ...settMap }));
        } catch (error) {
            console.error("Gagal mengambil referensi form", error);
        } finally {
            setLoading(false);
        }
    };

    const parseTanggalLahir = (val, jenis) => {
        if (!val) return '';
        if (jenis === 'POLRI' && val.length >= 4) {
            const yyStr = val.substring(0, 2);
            let yy = parseInt(yyStr);
            const curY = new Date().getFullYear() % 100;
            const yyyy = yy <= curY ? 2000 + yy : 1900 + yy;
            const mm = val.substring(2, 4);

            if (parseInt(mm) >= 1 && parseInt(mm) <= 12) {
                return `${yyyy}-${mm}-01`;
            }
        } else if (jenis === 'PNS' && val.length >= 8) {
            const yyyy = val.substring(0, 4);
            const mm = val.substring(4, 6);
            const dd = val.substring(6, 8);

            if (parseInt(mm) >= 1 && parseInt(mm) <= 12 && parseInt(dd) >= 1 && parseInt(dd) <= 31) {
                return `${yyyy}-${mm}-${dd}`;
            }
        }
        return '';
    };

    const checkNrpNipApi = async (val) => {
        try {
            const res = await api.get(`/personel/check/${val}`);
            if (!res.data.available) {
                setNrpStatus({ isValid: false, message: `Sudah terdaftar atas nama: ${res.data.name}` });
            } else {
                setNrpStatus({ isValid: true, message: 'Tersedia' });
            }
        } catch {
            setNrpStatus({ isValid: true, message: '' });
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === 'nrpNip' || name === 'jenisPegawai') {
            let processedNrp = name === 'nrpNip' ? value.replace(/\D/g, '') : formData.nrpNip;
            const targetJenis = name === 'jenisPegawai' ? value : formData.jenisPegawai;
            const limit = targetJenis === 'POLRI' ? appSettings.PANJANG_NRP_POLRI : appSettings.PANJANG_NIP_PNS;

            // Enforce length limit
            if (processedNrp.length > limit) {
                processedNrp = processedNrp.substring(0, limit);
            }

            const targetVal = processedNrp;
            const tgl = parseTanggalLahir(targetVal, targetJenis);
            const reqLen = limit;
            let isValidFormat = false;
            let formatErrMsg = `Format harus ${reqLen} digit angka.`;

            if (targetVal.length === reqLen) {
                isValidFormat = true; // Since we filtered non-digits, length check is enough for basic format
                if (tgl === '') {
                    isValidFormat = false;
                    formatErrMsg = targetJenis === 'POLRI' ? 'Bulan/Tahun kelahiran pada digit awal tidak valid.' : 'Tanggal/Bulan pada kelahiran NIP tidak valid.';
                } else if (isValidFormat && tgl !== '') {
                    const tglLahir = new Date(tgl);
                    const today = new Date();
                    let age = today.getFullYear() - tglLahir.getFullYear();
                    const m = today.getMonth() - tglLahir.getMonth();
                    if (m < 0 || (m === 0 && today.getDate() < tglLahir.getDate())) {
                        age--;
                    }

                    const minAge = targetJenis === 'POLRI' ? appSettings.USIA_MINIMAL_POLRI : appSettings.USIA_MINIMAL_PNS;
                    const maxAge = targetJenis === 'POLRI' ? appSettings.USIA_PENSIUN_POLRI : appSettings.USIA_PENSIUN_PNS;

                    if (age < minAge) {
                        isValidFormat = false;
                        formatErrMsg = `Terdeteksi usia ${age} tahun. Syarat minimal adalah ${minAge} tahun.`;
                    } else if (age >= maxAge) {
                        isValidFormat = false;
                        formatErrMsg = `Terdeteksi usia ${age} tahun. Personel telah memasuki masa pensiun (${maxAge} tahun).`;
                    }
                }
            }

            if (targetVal.length > 0 && !isValidFormat) {
                setNrpStatus({ isValid: false, message: formatErrMsg });
            } else if (isValidFormat && !isEdit) {
                setNrpStatus({ isValid: true, message: 'Format Sesuai. Memeriksa...' });
                if (typingTimeout) clearTimeout(typingTimeout);
                setTypingTimeout(setTimeout(() => {
                    checkNrpNipApi(targetVal);
                }, 500));
            } else {
                setNrpStatus({ isValid: true, message: '' });
            }

            setFormData(prev => ({
                ...prev,
                jenisPegawai: targetJenis,
                nrpNip: targetVal,
                ...(name === 'jenisPegawai' ? { pangkat: '' } : {}),
                tanggalLahir: tgl || prev.tanggalLahir
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                satkerId: parseInt(formData.satkerId)
            };

            let response;
            if (isEdit) {
                response = await api.put(`/personel/${formData.id}`, payload);
            } else {
                response = await api.post('/personel', payload);
            }

            // Sync stats but don't block the UI if it fails
            try {
                refreshDashboard();
            } catch (err) {
                console.error("Dashboard refresh failed:", err);
            }

            try {
                if (onSuccess) onSuccess(response.data.data || response.data);
            } catch (err) {
                console.error("onSuccess callback failed:", err);
            }
            onClose();

            toast.success(isEdit ? 'Data Personel berhasil diupdate' : 'Data Personel berhasil ditambahkan');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Terjadi kesalahan saat menyimpan data');
        }

    };

    const listPangkat = formData.jenisPegawai === 'POLRI' ? pangkatPolri : pangkatPns;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? "Edit Data Personel" : "Tambah Personel Baru"}>
            {loading ? <div className="loading-state">Memuat Konfigurasi...</div> : (
                <form onSubmit={handleSubmit}>
                    {initialData?.catatanRevisi && (
                        <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#fff5f5', border: '1px solid #feb2b2', borderRadius: '8px', color: '#c53030', fontSize: '0.9rem' }}>
                            <strong style={{ display: 'block', marginBottom: '4px', fontSize: '1rem' }}>⚠️ Instruksi Perbaikan dari Admin:</strong>
                            {initialData.catatanRevisi}
                        </div>
                    )}
                    <div className="flex gap-4">
                        <div className="form-group w-full">
                            <label>Jenis Pegawai</label>
                            <select className="form-input" name="jenisPegawai" value={formData.jenisPegawai} onChange={handleChange} disabled={isEdit}>
                                <option value="POLRI">POLRI</option>
                                <option value="PNS">PNS</option>
                            </select>
                        </div>
                        <div className="form-group w-full relative">
                            <label>{formData.jenisPegawai === 'POLRI' ? `NRP (${appSettings.PANJANG_NRP_POLRI} Digit)` : `NIP (${appSettings.PANJANG_NIP_PNS} Digit)`}</label>
                            <input
                                type="text"
                                className={`form-input ${!nrpStatus.isValid ? 'error-border' : ''}`}
                                name="nrpNip"
                                value={formData.nrpNip}
                                onChange={handleChange}
                                disabled={isEdit}
                                required
                                maxLength={formData.jenisPegawai === 'POLRI' ? appSettings.PANJANG_NRP_POLRI : appSettings.PANJANG_NIP_PNS}
                                inputMode="numeric"
                                pattern={`\\d{${formData.jenisPegawai === 'POLRI' ? appSettings.PANJANG_NRP_POLRI : appSettings.PANJANG_NIP_PNS}}`}
                                title={formData.jenisPegawai === 'POLRI' ? `NRP harus ${appSettings.PANJANG_NRP_POLRI} digit angka` : `NIP harus ${appSettings.PANJANG_NIP_PNS} digit angka`}
                            />
                            {formData.nrpNip && (
                                <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: nrpStatus.isValid ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                                    {nrpStatus.message}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Nama Lengkap</label>
                        <input type="text" className="form-input" name="namaLengkap" value={formData.namaLengkap} onChange={handleChange} required />
                    </div>

                    <div className="flex gap-4">
                        <div className="form-group w-full">
                            <label>Pangkat</label>
                            <select className="form-input" name="pangkat" value={formData.pangkat} onChange={handleChange} required>
                                <option value="">Pilih Pangkat</option>
                                {listPangkat.map(p => (
                                    <option key={p} value={p}>{p}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group w-full">
                            <label>Jabatan</label>
                            <input type="text" className="form-input" name="jabatan" value={formData.jabatan} onChange={handleChange} required />
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="form-group w-full" style={{ display: 'none' }}>
                            <label>Tanggal Lahir</label>
                            <DatePicker
                                locale={id}
                                dateFormat="d MMMM yyyy"
                                className="form-input"
                                selected={formData.tanggalLahir ? new Date(formData.tanggalLahir) : null}
                                onChange={(date) => handleChange({ target: { name: 'tanggalLahir', value: date ? format(date, 'yyyy-MM-dd') : '' } })}
                                disabled={isEdit}
                                required
                            />
                        </div>
                        <div className="form-group w-full">
                            <label>Kesatuan / Satker</label>
                            <select
                                className="form-input"
                                name="satkerId"
                                value={formData.satkerId}
                                onChange={handleChange}
                                required
                                disabled={user?.role === 'OPERATOR_SATKER'}
                            >
                                <option value="">Pilih Kesatuan</option>
                                {satkerList.map(s => (
                                    <option key={s.id} value={s.id}>{s.nama}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-actions mt-4">
                        <button type="button" className="btn-secondary" onClick={onClose}>Batal</button>
                        <button type="submit" className="btn-primary" disabled={!nrpStatus.isValid && !isEdit}>Simpan Data</button>
                    </div>
                </form>
            )}
        </Modal>
    );
};

export default PersonelFormModal;
