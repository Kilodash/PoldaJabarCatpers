import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext'
import './index.css'

// Hide initial HTML loader when React mounts
const hideInitialLoader = () => {
  const loader = document.getElementById('initial-loader');
  if (loader) {
    loader.classList.add('hidden');
    // Remove from DOM after animation
    setTimeout(() => loader.remove(), 300);
  }
};

// Mark root as ready
const markRootReady = () => {
  const root = document.getElementById('root');
  if (root) {
    root.classList.add('ready');
  }
};

const rootElement = document.getElementById('root');
const root = ReactDOM.createRoot(rootElement);

// Production mode - no StrictMode for better performance
const isProduction = import.meta.env.PROD;

const AppWrapper = () => {
  // Hide loader after first render
  React.useEffect(() => {
    hideInitialLoader();
    markRootReady();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

if (isProduction) {
  root.render(<AppWrapper />);
} else {
  // Development mode with StrictMode
  root.render(
    <React.StrictMode>
      <AppWrapper />
    </React.StrictMode>
  );
}

// Report web vitals in development
if (!isProduction && typeof window !== 'undefined') {
  // Log performance metrics
  if ('performance' in window && 'getEntriesByType' in window.performance) {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const [navigation] = performance.getEntriesByType('navigation');
        if (navigation) {
          console.log('[Performance] DOM Content Loaded:', Math.round(navigation.domContentLoadedEventEnd), 'ms');
          console.log('[Performance] Load Complete:', Math.round(navigation.loadEventEnd), 'ms');
        }
      }, 0);
    });
  }
}
