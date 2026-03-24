import React, { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { DashboardProvider } from './context/DashboardContext';
import { Toaster } from 'sonner';
import MainLayout from './components/MainLayout';

// Eager load Login and Dashboard for instant access
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

// Lazy load less critical pages
const Personel = lazy(() => import('./pages/Personel'));
const Pelanggaran = lazy(() => import('./pages/Pelanggaran'));
const Pengaturan = lazy(() => import('./pages/Pengaturan'));
const Pencarian = lazy(() => import('./pages/Pencarian'));

// Prefetch functions for lazy-loaded routes
const prefetchPersonel = () => import('./pages/Personel');
const prefetchPelanggaran = () => import('./pages/Pelanggaran');
const prefetchPengaturan = () => import('./pages/Pengaturan');
const prefetchPencarian = () => import('./pages/Pencarian');

// Optimized loading fallback - minimal and fast
const PageLoader = () => (
  <div style={{ 
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center',
    background: '#f8f9fa',
    zIndex: 9999
  }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{ 
        width: '48px', 
        height: '48px', 
        border: '4px solid #e5e7eb', 
        borderTop: '4px solid #2563eb',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        margin: '0 auto 0.75rem'
      }}></div>
      <p style={{ 
        color: '#64748b', 
        fontSize: '0.875rem',
        fontWeight: 500,
        margin: 0
      }}>Memuat...</p>
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

  // Prefetch secondary routes after initial render
  useEffect(() => {
    if (user) {
      // Prefetch commonly used pages in background (low priority)
      const timer = setTimeout(() => {
        prefetchPersonel();
        prefetchPelanggaran();
        // Delay less critical pages
        setTimeout(() => {
          prefetchPencarian();
          prefetchPengaturan();
        }, 2000);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [user]);

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
