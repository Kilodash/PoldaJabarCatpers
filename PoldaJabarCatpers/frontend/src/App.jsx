import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { DashboardProvider } from './context/DashboardContext';
import { Toaster } from 'sonner';
import MainLayout from './components/MainLayout';

// Lazy load pages for better performance
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Personel = lazy(() => import('./pages/Personel'));
const Pelanggaran = lazy(() => import('./pages/Pelanggaran'));
const Pengaturan = lazy(() => import('./pages/Pengaturan'));
const Pencarian = lazy(() => import('./pages/Pencarian'));

// Loading fallback component
const PageLoader = () => (
  <div style={{ 
    height: '100vh', 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center',
    background: '#f8f9fa' 
  }}>
    <div style={{ 
      padding: '2rem', 
      background: 'white', 
      borderRadius: '12px', 
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      textAlign: 'center'
    }}>
      <div style={{ 
        width: '40px', 
        height: '40px', 
        border: '4px solid #e5e7eb', 
        borderTop: '4px solid #2563eb',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        margin: '0 auto 1rem'
      }}></div>
      <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Memuat halaman...</p>
    </div>
  </div>
);

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <MainLayout>{children}</MainLayout>;
};

function App() {
  const { user, loading } = useAuth();

  // Simplified loading - only show if truly needed
  if (loading) {
    return <PageLoader />;
  }

  return (
    <DashboardProvider>
      <Toaster position="top-right" richColors toastOptions={{ style: { zIndex: 99999 } }} />
      <Suspense fallback={<PageLoader />}>
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
      </Suspense>
    </DashboardProvider>
  );
}

export default App;
