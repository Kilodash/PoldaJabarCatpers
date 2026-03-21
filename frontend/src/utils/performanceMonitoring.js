/**
 * Performance Monitoring Utility
 * Tracks Web Vitals and sends to analytics
 */

let analyticsEndpoint = null;
let isMonitoringEnabled = false;

// Initialize performance monitoring
export const initPerformanceMonitoring = (endpoint = '/api/analytics/performance') => {
  analyticsEndpoint = endpoint;
  isMonitoringEnabled = true;

  // Monitor Web Vitals
  if ('web-vital' in window || typeof window !== 'undefined') {
    measureWebVitals();
  }

  // Monitor custom metrics
  measureCustomMetrics();

  console.log('[Performance] Monitoring initialized');
};

// Measure Web Vitals (FCP, LCP, FID, CLS, TTFB)
const measureWebVitals = () => {
  try {
    // Use native PerformanceObserver API
    if ('PerformanceObserver' in window) {
      // Largest Contentful Paint (LCP)
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        sendMetric('LCP', lastEntry.renderTime || lastEntry.loadTime);
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // First Input Delay (FID)
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          sendMetric('FID', entry.processingStart - entry.startTime);
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });

      // Cumulative Layout Shift (CLS)
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        sendMetric('CLS', clsValue);
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    }

    // First Contentful Paint (FCP) & Time to First Byte (TTFB)
    window.addEventListener('load', () => {
      const paintEntries = performance.getEntriesByType('paint');
      const fcpEntry = paintEntries.find((entry) => entry.name === 'first-contentful-paint');
      if (fcpEntry) {
        sendMetric('FCP', fcpEntry.startTime);
      }

      const navEntry = performance.getEntriesByType('navigation')[0];
      if (navEntry) {
        sendMetric('TTFB', navEntry.responseStart);
      }
    });
  } catch (error) {
    console.error('[Performance] Error measuring Web Vitals:', error);
  }
};

// Measure custom application metrics
const measureCustomMetrics = () => {
  // Time to Interactive (TTI) - approximate
  window.addEventListener('load', () => {
    setTimeout(() => {
      const tti = performance.now();
      sendMetric('TTI', tti);
    }, 0);
  });

  // Page Load Time
  window.addEventListener('load', () => {
    const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
    sendMetric('PageLoad', loadTime);
  });

  // DOM Content Loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      const dclTime = performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart;
      sendMetric('DCL', dclTime);
    });
  }
};

// Send metric to analytics endpoint
const sendMetric = (name, value, metadata = {}) => {
  if (!isMonitoringEnabled) return;

  const metric = {
    name,
    value: Math.round(value),
    timestamp: Date.now(),
    url: window.location.pathname,
    ...metadata
  };

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Performance] ${name}: ${metric.value}ms`, metric);
  }

  // Send to analytics endpoint (optional)
  if (analyticsEndpoint && navigator.sendBeacon) {
    try {
      const blob = new Blob([JSON.stringify(metric)], { type: 'application/json' });
      navigator.sendBeacon(analyticsEndpoint, blob);
    } catch (error) {
      console.error('[Performance] Error sending metric:', error);
    }
  }
};

// Manual metric tracking
export const trackMetric = (name, value, metadata = {}) => {
  sendMetric(name, value, metadata);
};

// Track component render time
export const measureComponentRender = (componentName) => {
  const startTime = performance.now();

  return () => {
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    sendMetric(`ComponentRender_${componentName}`, renderTime);
  };
};

// Get current performance metrics
export const getPerformanceMetrics = () => {
  const navigation = performance.getEntriesByType('navigation')[0];
  const paint = performance.getEntriesByType('paint');

  return {
    // Navigation timing
    dns: navigation?.domainLookupEnd - navigation?.domainLookupStart,
    tcp: navigation?.connectEnd - navigation?.connectStart,
    ttfb: navigation?.responseStart - navigation?.requestStart,
    download: navigation?.responseEnd - navigation?.responseStart,
    domInteractive: navigation?.domInteractive,
    domComplete: navigation?.domComplete,
    loadComplete: navigation?.loadEventEnd - navigation?.loadEventStart,

    // Paint timing
    fcp: paint.find((entry) => entry.name === 'first-contentful-paint')?.startTime,
    lcp: paint.find((entry) => entry.name === 'largest-contentful-paint')?.startTime,

    // Memory (if available)
    memory: performance.memory
      ? {
          used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
          total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
          limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
        }
      : null
  };
};

export default {
  init: initPerformanceMonitoring,
  track: trackMetric,
  measureRender: measureComponentRender,
  getMetrics: getPerformanceMetrics
};
