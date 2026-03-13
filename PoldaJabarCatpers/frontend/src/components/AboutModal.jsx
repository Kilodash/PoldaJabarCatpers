import React from 'react';
import Modal from './Modal';
import { Info, MapPin, Phone, User, Users, ShieldCheck, Mail, FileText } from 'lucide-react';

const AboutModal = ({ isOpen, onClose }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Tentang Aplikasi" maxWidth="600px">
            <div className="about-content" style={{ color: 'var(--text-main)' }}>
                <div style={{ textAlign: 'center', marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                    <img src="https://bidpropam.sumsel.polri.go.id/ecpp/public/images/logo/logo-paminal.png" alt="Logo Paminal" style={{ height: '80px', marginBottom: '1rem' }} />
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary-color)', margin: '0 0 0.5rem 0' }}>CDS POLDA JABAR</h2>
                    <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-muted)' }}>(c) 2026 Subbidpaminal Bidpropam Polda Jabar</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <section>
                        <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--primary-color)' }}>
                            <MapPin size={18} /> Alamat Kantor
                        </h4>
                        <p style={{ margin: 0, paddingLeft: '1.75rem' }}>Jl. Soekarno-Hatta 748 Kota Bandung</p>
                    </section>

                    <section>
                        <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--primary-color)' }}>
                            <FileText size={18} /> Dokumentasi
                        </h4>
                        <div style={{ paddingLeft: '1.75rem' }}>
                            <a 
                                href="/Panduan_Penggunaan_CDS.md" 
                                target="_blank" 
                                rel="noreferrer"
                                style={{ 
                                    color: 'var(--info)', 
                                    fontWeight: 600, 
                                    textDecoration: 'underline',
                                    fontSize: '0.95rem'
                                }}
                            >
                                Buka Panduan Penggunaan (User Manual)
                            </a>
                        </div>
                    </section>

                    <section>
                        <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--primary-color)' }}>
                            <Users size={18} /> Tim Pengembang
                        </h4>
                        
                        <div style={{ paddingLeft: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Penanggung Jawab</div>
                                <div style={{ fontWeight: 600 }}>KOMBES POL. ADIWIJAYA, S.I.K.</div>
                            </div>

                            <div>
                                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Pelaksana</div>
                                <div style={{ fontWeight: 600 }}>KOMPOL CANDRA KIRANA PUTRA, S.I.K., S.H., M.Si., CPHR.</div>
                            </div>

                            <div>
                                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Personel Urlitpers</div>
                                <ul style={{ margin: 0, paddingLeft: '1.25rem', listStyleType: 'circle', lineHeight: '1.6' }}>
                                    <li>KOMPOL ANGGA HANDIMAN, S.I.K., M.M.</li>
                                    <li>IPTU KIKI HAJAR SAMUDRA</li>
                                    <li>AIPTU ASEP MAKSUM</li>
                                    <li>AIPDA ERY YUNUS, S.M.</li>
                                    <li>BRIPTU RAHMAT SOMANTRI</li>
                                    <li>PENGDA TK 1 SRI CASMIATI, S.H.</li>
                                    <li>WAHYU SOVIAN</li>
                                </ul>
                            </div>

                            <div>
                                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Admin Aplikasi</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ fontWeight: 600 }}>DANI PERMANA</span>
                                    <a href="mailto:danipermanax@gmail.com" style={{ color: 'var(--info)', display: 'flex', alignItems: 'center' }}>
                                        <Mail size={14} />
                                    </a>
                                </div>
                            </div>
                        </div>
                    </section> section

                    <section style={{ background: 'var(--bg-color)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                         <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--primary-color)' }}>
                            <Phone size={18} /> Layanan Bantuan (WhatsApp)
                        </h4>
                        <div style={{ paddingLeft: '1.75rem' }}>
                            <a 
                                href="https://wa.me/628122129882" 
                                target="_blank" 
                                rel="noreferrer"
                                style={{ 
                                    display: 'inline-flex', 
                                    alignItems: 'center', 
                                    gap: '0.5rem', 
                                    background: '#25D366', 
                                    color: 'white', 
                                    padding: '0.5rem 1rem', 
                                    borderRadius: '8px',
                                    fontWeight: 600,
                                    textDecoration: 'none',
                                    transition: 'transform 0.2s'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                <Phone size={16} fill="white" />
                                08122129882
                            </a>
                        </div>
                    </section>
                </div>
            </div>
        </Modal>
    );
};

export default AboutModal;
