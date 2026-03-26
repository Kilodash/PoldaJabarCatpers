import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173
  },
  build: {
    // Optimize chunk splitting for faster initial load
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React (needed immediately)
          'react-core': ['react', 'react-dom'],
          // Router (needed for navigation)
          'router': ['react-router-dom'],
          // UI libraries (can be deferred)
          'ui-libs': ['lucide-react', 'sonner'],
          // Date utilities
          'date-utils': ['react-datepicker', 'date-fns'],
          // Network and auth
          'network': ['axios', 'js-cookie', 'jwt-decode'],
          // Supabase (separate chunk for lazy loading)
          'supabase': ['@supabase/supabase-js'],
          // PDF generation (only loaded when needed)
          'pdf': ['jspdf', 'jspdf-autotable']
        },
        // Use content hash for better caching
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 500,
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Use esbuild for faster builds (terser is slower)
    minify: 'esbuild',
    // Target modern browsers for smaller bundles
    target: 'es2020',
    // Generate source maps for debugging (disable in production for smaller size)
    sourcemap: false,
  },
  // Optimize dependencies for faster dev server
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'react-router-dom', 
      'axios',
      'js-cookie'
    ],
    // Exclude heavy libraries from pre-bundling
    exclude: ['jspdf', 'jspdf-autotable']
  },
  // Resolve aliases for cleaner imports
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  // Define global constants
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0')
  }
})
