import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { DashboardProvider } from './context/DashboardContext';
import Login from './pages/Login';

import Dashboard from './pages/Dashboard';
import Personel from './pages/Personel';
import Pelanggaran from './pages/Pelanggaran';
import Pengaturan from './pages/Pengaturan';
import Pencarian from './pages/Pencarian';
import MainLayout from './components/MainLayout';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: '#f8f9fa' }}>
        <div style={{ padding: '2rem', background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: 0, color: '#2563eb' }}>Memuat Sesi...</h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.5rem' }}>Mohon tunggu sebentar.</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <MainLayout>{children}</MainLayout>;
};

function App() {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: '#f8f9fa' }}>
        <div style={{ padding: '2rem', background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: 0, color: '#2563eb' }}>Memuat Aplikasi...</h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.5rem' }}>Mohon tunggu sebentar.</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardProvider>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />

        <Route path="/personel" element={
          <ProtectedRoute>
            <Personel />
          </ProtectedRoute>
        } />

        <Route path="/pelanggaran" element={
          <ProtectedRoute>
            <Pelanggaran />
          </ProtectedRoute>
        } />

        <Route path="/pencarian" element={
          <ProtectedRoute>
            <Pencarian />
          </ProtectedRoute>
        } />

        <Route path="/pengaturan" element={
          <ProtectedRoute>
            <Pengaturan />
          </ProtectedRoute>
        } />

        <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
        <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </DashboardProvider>
  );
}

export default App;
