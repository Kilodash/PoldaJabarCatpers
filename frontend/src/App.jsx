import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { DashboardProvider } from './context/DashboardContext';
import { Toaster } from 'sonner';
import Login from './pages/Login';
import MainLayout from './components/MainLayout';

// OPTIMIZED: Lazy load pages for better initial load
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
    alignItems: 'center', 
    justifyContent: 'center',
    background: '#f8f9fa'
  }}>
    <div style={{
      padding: '1.5rem 2rem',
      background: 'white',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
    }}>
      <div style={{
        width: '32px',
        height: '32px',
        border: '3px solid #e5e7eb',
        borderTopColor: '#2563eb',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        margin: '0 auto'
      }} />
    </div>
  </div>
);

// Protected Route Component - OPTIMIZED
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  // OPTIMIZED: Only show minimal loading, not full screen blocking
  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <MainLayout>
      <Suspense fallback={<PageLoader />}>
        {children}
      </Suspense>
    </MainLayout>
  );
};

function App() {
  const { user, loading } = useAuth();

  // OPTIMIZED: Minimal loading screen, only when absolutely necessary
  if (loading) {
    return <PageLoader />;
  }

  return (
    <>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <DashboardProvider>
        <Toaster position="top-right" richColors toastOptions={{ style: { zIndex: 99999 } }} />
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
    </>
  );
}

export default App;
