import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, FileWarning, LogOut, Menu, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './MainLayout.css';

const Sidebar = ({ isOpen, toggleSidebar }) => {
    const { user } = useAuth();
    return (
        <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
            <div className="sidebar-header">
                <h2>CDS Polda Jabar</h2>
                <button className="mobile-close" onClick={toggleSidebar}>&times;</button>
            </div>
            <nav className="sidebar-nav">
                <NavLink to="/dashboard" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                    <LayoutDashboard size={20} />
                    <span>Dashboard</span>
                </NavLink>
                <NavLink to="/personel" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                    <Users size={20} />
                    <span>Data Personel</span>
                </NavLink>
                <NavLink to="/pelanggaran" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                    <FileWarning size={20} />
                    <span>Pelanggaran</span>
                </NavLink>
                {user?.role === 'ADMIN_POLDA' && (
                    <NavLink to="/pengaturan" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
                        <Settings size={20} />
                        <span>Pengaturan</span>
                    </NavLink>
                )}
            </nav>
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
    const [sidebarOpen, setSidebarOpen] = React.useState(false);

    const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

    return (
        <div className="layout-wrapper">
            <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

            {/* Overlay for mobile responsive */}
            {sidebarOpen && <div className="sidebar-overlay" onClick={toggleSidebar}></div>}

            <main className="main-content">
                <Navbar toggleSidebar={toggleSidebar} />
                <div className="page-container">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default MainLayout;
