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
  if (loading) return <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>Memuat Sesi...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <MainLayout>{children}</MainLayout>;
};

function App() {
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

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </DashboardProvider>
  );
}

export default App;
