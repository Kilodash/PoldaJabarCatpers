import React from 'react';
import Modal from './Modal';
import { Info, MapPin, Phone, User, Users, ShieldCheck, Mail, FileText } from 'lucide-react';

const AboutModal = ({ isOpen, onClose }) => {
    const APP_VERSION = "1.1.0-STABLE";
    const RELEASE_DATE = "15 Maret 2026";

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Tentang Aplikasi" maxWidth="650px">
            <div className="about-content" style={{ color: 'var(--text-main)', padding: '0.5rem' }}>
                {/* Header Section */}
                <div style={{
                    textAlign: 'center',
                    marginBottom: '2rem',
                    padding: '1.5rem',
                    background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.03) 0%, rgba(15, 23, 42, 0.08) 100%)',
                    borderRadius: '16px',
                    border: '1px solid var(--border-color)'
                }}>
                    <img
                        src="https://bidpropam.sumsel.polri.go.id/ecpp/public/images/logo/logo-paminal.png"
                        alt="Logo Paminal"
                        style={{ height: '70px', marginBottom: '1rem', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }}
                    />
                    <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary-color)', margin: '0 0 0.25rem 0', letterSpacing: '-0.02em' }}>
                        CDS POLDA JABAR
                    </h2>
                    <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                        Catatan Personel Polda Jawa Barat
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', fontSize: '0.75rem' }}>
                        <span style={{ background: 'var(--primary-color)', color: 'white', padding: '3px 10px', borderRadius: '20px', fontWeight: 700 }}>
                            v{APP_VERSION}
                        </span>
                        <span style={{ background: '#e2e8f0', color: '#475569', padding: '3px 10px', borderRadius: '20px', fontWeight: 600 }}>
                            Rilis: {RELEASE_DATE}
                        </span>
                    </div>
                </div>

                {/* Info Grid */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--primary-color)', fontSize: '0.9rem' }}>
                                <MapPin size={16} /> Lokasi Kantor
                            </h4>
                            <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: '1.4' }}>
                                Subbidpaminal Bidpropam<br />
                                Jl. Soekarno-Hatta 748, Bandung
                            </p>
                        </div>
                        <div style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--primary-color)', fontSize: '0.9rem' }}>
                                <FileText size={16} /> Dokumentasi
                            </h4>
                            <a
                                href="/manual.html"
                                target="_blank"
                                rel="noreferrer"
                                style={{ color: 'var(--info)', fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                                [ Buka User Manual ]
                            </a>
                        </div>
                    </div>

                    <section style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                        <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--primary-color)', fontSize: '0.95rem' }}>
                            <Users size={18} /> Tim Pengembang & Support
                        </h4>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '4px' }}>
                                <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Penanggung Jawab</span>
                                <span style={{ fontWeight: 600 }}>KOMBES POL. ADIWIJAYA, S.I.K.</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '4px' }}>
                                <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Ketua Pelaksana</span>
                                <span style={{ fontWeight: 600 }}>KOMPOL CANDRA KIRANA PUTRA, S.I.K.</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Admin Sistem</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontWeight: 600 }}>DANI PERMANA</span>
                                    <a href="mailto:danipermanax@gmail.com" style={{ color: 'var(--info)' }}><Mail size={14} /></a>
                                </div>
                            </div>
                        </div>

                        {/* Personel Litpers Section */}
                        <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <ShieldCheck size={14} /> Personel Urlitpers
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                                <div>• KOMPOL ANGGA HANDIMAN</div>
                                <div>• IPTU KIKI HAJAR SAMUDRA</div>
                                <div>• AIPTU ASEP MAKSUM</div>
                                <div>• AIPDA ERY YUNUS, S.M.</div>
                                <div>• BRIPTU RAHMAT SOMANTRI</div>
                                <div>• PENGATUR TK1 SRI CASMIATI, SH.</div>
                                <div>• WAHYU SOVIAN</div>
                            </div>
                        </div>
                    </section>

                    <a
                        href="https://wa.me/628122129882"
                        target="_blank"
                        rel="noreferrer"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.75rem',
                            background: '#25D366',
                            color: 'white',
                            padding: '0.75rem',
                            borderRadius: '10px',
                            fontWeight: 700,
                            textDecoration: 'none',
                            fontSize: '0.9rem'
                        }}
                    >
                        <Phone size={18} fill="white" />
                        HUBUNGI WHATSAPP HELPDESK (0812-2129-882)
                    </a>
                </div>

                <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    &copy; 2026 Subbidpaminal Bidpropam Polda Jabar
                </div>
            </div>
        </Modal>
    );
};

export default AboutModal;
