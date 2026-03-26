import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { DashboardProvider } from './context/DashboardContext';
import { Toaster } from 'sonner';
import MainLayout from './components/MainLayout';

// Eager load Login and Dashboard for instant access (critical path)
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

// Optimized loading fallback - minimal, fast, CSS-only animation
const PageLoader = () => (
  <div className="page-loader-container">
    <div className="page-loader-spinner"></div>
    <p className="page-loader-text">Memuat...</p>
    <style>{`
      .page-loader-container {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        background: #f8fafc;
        z-index: 9999;
      }
      .page-loader-spinner {
        width: 40px;
        height: 40px;
        border: 3px solid #e2e8f0;
        border-top: 3px solid #3b82f6;
        border-radius: 50%;
        animation: spin 0.6s linear infinite;
      }
      .page-loader-text {
        margin-top: 12px;
        color: #64748b;
        font-size: 14px;
        font-weight: 500;
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

// Initial loading screen with timeout fallback
const InitialLoader = ({ onTimeout }) => {
  useEffect(() => {
    // Safety timeout - if still loading after 5s, force proceed
    const timeout = setTimeout(() => {
      console.warn('[APP] Loading timeout reached, proceeding anyway');
      onTimeout?.();
    }, 5000);
    
    return () => clearTimeout(timeout);
  }, [onTimeout]);

  return (
    <div className="initial-loader-container">
      <div className="initial-loader-content">
        <div className="initial-loader-logo">
          <img 
            src="/logo-paminal.png" 
            alt="Logo" 
            width="64" 
            height="64"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>
        <div className="initial-loader-spinner"></div>
        <p className="initial-loader-text">Memuat aplikasi...</p>
      </div>
      <style>{`
        .initial-loader-container {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%);
          z-index: 9999;
        }
        .initial-loader-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }
        .initial-loader-logo {
          margin-bottom: 8px;
        }
        .initial-loader-logo img {
          width: 64px;
          height: 64px;
          object-fit: contain;
        }
        .initial-loader-spinner {
          width: 36px;
          height: 36px;
          border: 3px solid rgba(255,255,255,0.2);
          border-top: 3px solid #3b82f6;
          border-radius: 50%;
          animation: initialSpin 0.7s linear infinite;
        }
        .initial-loader-text {
          color: rgba(255,255,255,0.8);
          font-size: 14px;
          font-weight: 500;
        }
        @keyframes initialSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

// Protected Route Component with better loading handling
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  // Show loader only for very short time if truly loading
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
  const [forceRender, setForceRender] = useState(false);

  // Prefetch secondary routes after user is authenticated
  useEffect(() => {
    if (user) {
      // Prefetch commonly used pages in background (low priority)
      const timer = setTimeout(() => {
        requestIdleCallback?.(() => {
          prefetchPersonel();
          prefetchPelanggaran();
        }) || (() => {
          prefetchPersonel();
          prefetchPelanggaran();
        })();
        
        // Delay less critical pages more
        setTimeout(() => {
          requestIdleCallback?.(() => {
            prefetchPencarian();
            prefetchPengaturan();
          }) || (() => {
            prefetchPencarian();
            prefetchPengaturan();
          })();
        }, 2000);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [user]);

  // Handle loading timeout
  const handleLoadingTimeout = () => {
    setForceRender(true);
  };

  // Show initial loader only when truly needed
  if (loading && !forceRender) {
    return <InitialLoader onTimeout={handleLoadingTimeout} />;
  }

  return (
    <DashboardProvider>
      <Toaster 
        position="top-right" 
        richColors 
        toastOptions={{ 
          style: { zIndex: 99999 },
          duration: 3000
        }} 
      />
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
