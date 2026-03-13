import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, FileWarning, Search, LogOut, Menu, Settings, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AboutModal from './AboutModal';
import './MainLayout.css';

const Sidebar = ({ isOpen, toggleSidebar, onOpenAbout }) => {
    const { user } = useAuth();
    return (
        <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
            <div className="sidebar-header">
                <div className="logo-wrapper">
                    <img src="https://bidpropam.sumsel.polri.go.id/ecpp/public/images/logo/logo-paminal.png" alt="Logo Paminal" style={{ height: '60px' }} />
                    <h2 style={{ fontSize: '1.1rem', margin: 0 }}>CDS Polda Jabar</h2>
                </div>
                <button className="mobile-close" onClick={toggleSidebar}>&times;</button>
            </div>
            <nav className="sidebar-nav">
                <NavLink to="/dashboard" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                    <LayoutDashboard size={20} />
                    <span>Dashboard</span>
                </NavLink>
                <NavLink to="/pelanggaran" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                    <FileWarning size={20} />
                    <span>Pelanggaran</span>
                </NavLink>
                {user?.role === 'ADMIN_POLDA' && (
                    <NavLink to="/pencarian" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                        <Search size={20} />
                        <span>Pencarian</span>
                    </NavLink>
                )}
                {user?.role === 'ADMIN_POLDA' && (
                    <NavLink to="/pengaturan" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                        <Settings size={20} />
                        <span>Pengaturan</span>
                    </NavLink>
                )}
            </nav>
            <div className="sidebar-footer">
                <div className="about-link" onClick={onOpenAbout}>
                    <Info size={16} />
                    <span>Tentang Aplikasi</span>
                </div>
            </div>
        </aside>
    );
};

const Navbar = ({ toggleSidebar }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <header className="navbar">
            <div className="nav-left">
                <button className="menu-btn" onClick={toggleSidebar}>
                    <Menu size={24} />
                </button>
                <div className="nav-title">
                    <h4>{user?.satker?.nama || 'Polda Jawa Barat'}</h4>
                    <span className="badge-role">{user?.role === 'ADMIN_POLDA' ? 'Super Admin' : 'Operator Satker'}</span>
                </div>
            </div>
            <div className="nav-right">
                <div className="user-info">
                    <div className="avatar">{user?.email?.charAt(0).toUpperCase()}</div>
                    <span className="user-email">{user?.email}</span>
                </div>
                <button className="btn-logout" onClick={handleLogout} title="Keluar">
                    <LogOut size={20} />
                </button>
            </div>
        </header>
    );
};

const MainLayout = ({ children }) => {
    const [sidebarOpen, setSidebarOpen] = React.useState(window.innerWidth > 768);
    const [isAboutModalOpen, setIsAboutModalOpen] = React.useState(false);

    React.useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth <= 768) {
                setSidebarOpen(false);
            } else {
                setSidebarOpen(true);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

    return (
        <div className="layout-wrapper">
            <Sidebar 
                isOpen={sidebarOpen} 
                toggleSidebar={toggleSidebar} 
                onOpenAbout={() => setIsAboutModalOpen(true)} 
            />

            {/* Overlay for mobile responsive */}
            {sidebarOpen && window.innerWidth <= 768 && <div className="sidebar-overlay" onClick={toggleSidebar}></div>}

            <main className="main-content">
                <Navbar toggleSidebar={toggleSidebar} />
                <div className="page-container">
                    {children}
                </div>
            </main>

            <AboutModal 
                isOpen={isAboutModalOpen} 
                onClose={() => setIsAboutModalOpen(false)} 
            />
        </div>
    );
};

export default MainLayout;
