import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, User, Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import './Login.css';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await login(email, password);
            toast.success('Login berhasil!');
            setTimeout(() => {
                navigate('/dashboard');
            }, 1000);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Gagal login. Periksa kembali kredensial Anda.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-container">
            <Toaster position="top-right" richColors />

            <div className="login-backdrop"></div>

            <div className="login-card glass-panel animate-fade-in">
                <div className="login-header">
                    <div className="logo-container" style={{ marginBottom: '1rem' }}>
                        <img src="https://bidpropam.sumsel.polri.go.id/ecpp/public/images/logo/logo-paminal.png" alt="Logo Paminal" style={{ height: '120px' }} />
                    </div>
                    <h2>Catatan Personel</h2>
                    <p>Database System Polda Jabar</p>
                </div>

                <form className="login-form" onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label htmlFor="email">Email Admin / Operator</label>
                        <div className="input-field">
                            <User size={18} className="input-icon" />
                            <input
                                type="email"
                                id="email"
                                placeholder="operator@poldajabar.go.id"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="input-group">
                        <label htmlFor="password">Kata Sandi</label>
                        <div className="input-field">
                            <Lock size={18} className="input-icon" />
                            <input
                                type={showPassword ? "text" : "password"}
                                id="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                                tabIndex="-1"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn-login"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <span className="flex items-center justify-center gap-2">
                                <Loader2 className="animate-spin" size={20} /> Memproses...
                            </span>
                        ) : 'Masuk ke Sistem'}
                    </button>
                </form>

                <div className="login-footer">
                    <p>&copy; {new Date().getFullYear()} Kepolisian Daerah Jawa Barat.</p>
                </div>
            </div>
        </div>
    );
};

export default Login;
