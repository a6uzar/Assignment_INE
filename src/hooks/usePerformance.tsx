import { useEffect, useRef, useState, useCallback } from 'react';

// Web Vitals types
interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

interface UsePerformanceOptions {
  reportWebVitals?: boolean;
  reportCustomMetrics?: boolean;
  onMetric?: (metric: PerformanceMetric) => void;
}

// Performance monitoring hook
export function usePerformanceMonitoring(options: UsePerformanceOptions = {}) {
  const {
    reportWebVitals = true,
    reportCustomMetrics = true,
    onMetric,
  } = options;

  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const metricsRef = useRef<PerformanceMetric[]>([]);

  const addMetric = useCallback((metric: PerformanceMetric) => {
    metricsRef.current.push(metric);
    setMetrics([...metricsRef.current]);
    onMetric?.(metric);
  }, [onMetric]);

  // Web Vitals monitoring
  useEffect(() => {
    if (!reportWebVitals) return;

    const reportMetric = (name: string, value: number, thresholds: [number, number]) => {
      const rating = value <= thresholds[0] ? 'good' : 
                    value <= thresholds[1] ? 'needs-improvement' : 'poor';
      
      addMetric({
        name,
        value,
        timestamp: Date.now(),
        rating,
      });
    };

    // Core Web Vitals
    
    // Largest Contentful Paint (LCP)
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as any;
      if (lastEntry) {
        reportMetric('LCP', lastEntry.startTime, [2500, 4000]);
      }
    });
    
    try {
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
      // Browser doesn't support LCP
    }

    // First Input Delay (FID)
    const fidObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry: any) => {
        reportMetric('FID', entry.processingStart - entry.startTime, [100, 300]);
      });
    });

    try {
      fidObserver.observe({ entryTypes: ['first-input'] });
    } catch (e) {
      // Browser doesn't support FID
    }

    // Cumulative Layout Shift (CLS)
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      });
    });

    try {
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
      // Browser doesn't support CLS
    }

    // Report CLS on page unload
    const reportCLS = () => {
      reportMetric('CLS', clsValue, [0.1, 0.25]);
    };

    window.addEventListener('beforeunload', reportCLS);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        reportCLS();
      }
    });

    return () => {
      observer.disconnect();
      fidObserver.disconnect();
      clsObserver.disconnect();
      window.removeEventListener('beforeunload', reportCLS);
    };
  }, [reportWebVitals, addMetric]);

  // Custom performance metrics
  const measureCustomMetric = useCallback((name: string, fn: () => void | Promise<void>) => {
    if (!reportCustomMetrics) return;

    const start = performance.now();
    
    const finish = () => {
      const duration = performance.now() - start;
      addMetric({
        name,
        value: duration,
        timestamp: Date.now(),
        rating: duration < 100 ? 'good' : duration < 500 ? 'needs-improvement' : 'poor',
      });
    };

    const result = fn();
    
    if (result instanceof Promise) {
      result.finally(finish);
    } else {
      finish();
    }
  }, [reportCustomMetrics, addMetric]);

  // Memory usage monitoring
  const measureMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      addMetric({
        name: 'Memory Usage',
        value: memory.usedJSHeapSize / 1024 / 1024, // MB
        timestamp: Date.now(),
        rating: memory.usedJSHeapSize / memory.jsHeapSizeLimit < 0.5 ? 'good' : 
               memory.usedJSHeapSize / memory.jsHeapSizeLimit < 0.8 ? 'needs-improvement' : 'poor',
      });
    }
  }, [addMetric]);

  return {
    metrics,
    measureCustomMetric,
    measureMemoryUsage,
  };
}

// Hook for monitoring component render performance
export function useRenderPerformance(componentName: string) {
  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef(0);
  const [renderStats, setRenderStats] = useState({
    count: 0,
    averageTime: 0,
    lastRenderTime: 0,
  });

  useEffect(() => {
    const startTime = performance.now();
    renderCountRef.current += 1;

    // Measure render time after the component has rendered
    const timeoutId = setTimeout(() => {
      const renderTime = performance.now() - startTime;
      lastRenderTimeRef.current = renderTime;

      setRenderStats(prev => ({
        count: renderCountRef.current,
        averageTime: (prev.averageTime * (prev.count - 1) + renderTime) / prev.count,
        lastRenderTime: renderTime,
      }));

      // Log slow renders in development
      if (process.env.NODE_ENV === 'development' && renderTime > 16) {
        console.warn(`Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`);
      }
    }, 0);

    return () => clearTimeout(timeoutId);
  });

  return renderStats;
}

// Hook for monitoring API call performance
export function useAPIPerformance() {
  const [apiMetrics, setApiMetrics] = useState<{
    [key: string]: {
      count: number;
      averageTime: number;
      lastCallTime: number;
      errorCount: number;
    };
  }>({});

  const measureAPI = useCallback(async <T,>(
    apiName: string, 
    apiCall: () => Promise<T>
  ): Promise<T> => {
    const startTime = performance.now();
    
    try {
      const result = await apiCall();
      const duration = performance.now() - startTime;
      
      setApiMetrics(prev => {
        const current = prev[apiName] || { count: 0, averageTime: 0, lastCallTime: 0, errorCount: 0 };
        return {
          ...prev,
          [apiName]: {
            count: current.count + 1,
            averageTime: (current.averageTime * current.count + duration) / (current.count + 1),
            lastCallTime: duration,
            errorCount: current.errorCount,
          },
        };
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      setApiMetrics(prev => {
        const current = prev[apiName] || { count: 0, averageTime: 0, lastCallTime: 0, errorCount: 0 };
        return {
          ...prev,
          [apiName]: {
            count: current.count + 1,
            averageTime: (current.averageTime * current.count + duration) / (current.count + 1),
            lastCallTime: duration,
            errorCount: current.errorCount + 1,
          },
        };
      });
      
      throw error;
    }
  }, []);

  return { apiMetrics, measureAPI };
}

// Performance dashboard component
export function PerformanceDashboard() {
  const { metrics, measureMemoryUsage } = usePerformanceMonitoring({
    onMetric: (metric) => {
      console.log('Performance metric:', metric);
    },
  });

  useEffect(() => {
    const interval = setInterval(measureMemoryUsage, 5000);
    return () => clearInterval(interval);
  }, [measureMemoryUsage]);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border rounded-lg shadow-lg p-4 max-w-sm z-50">
      <h3 className="font-semibold mb-2">Performance Metrics</h3>
      <div className="space-y-2 text-sm">
        {metrics.slice(-5).map((metric, index) => (
          <div key={index} className="flex justify-between items-center">
            <span>{metric.name}</span>
            <div className="flex items-center gap-2">
              <span>{metric.value.toFixed(2)}</span>
              <div
                className={`w-2 h-2 rounded-full ${
                  metric.rating === 'good' ? 'bg-green-500' :
                  metric.rating === 'needs-improvement' ? 'bg-yellow-500' : 'bg-red-500'
                }`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Utility functions for performance optimization
export const performanceUtils = {
  // Debounce function for reducing API calls
  debounce: <T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(null, args), wait);
    };
  },

  // Throttle function for scroll/resize events
  throttle: <T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): ((...args: Parameters<T>) => void) => {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func.apply(null, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  },

  // Lazy load images
  lazyLoadImages: () => {
    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          img.src = img.dataset.src!;
          img.removeAttribute('data-src');
          imageObserver.unobserve(img);
        }
      });
    });

    images.forEach(img => imageObserver.observe(img));
  },

  // Measure bundle size
  measureBundleSize: () => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      console.log(`Network: ${connection.effectiveType}, Downlink: ${connection.downlink}Mbps`);
    }

    // Estimate bundle size from loaded scripts
    const scripts = Array.from(document.scripts);
    let totalSize = 0;
    
    scripts.forEach(script => {
      if (script.src) {
        fetch(script.src, { method: 'HEAD' })
          .then(response => {
            const size = response.headers.get('content-length');
            if (size) {
              totalSize += parseInt(size);
              console.log(`Script: ${script.src}, Size: ${(parseInt(size) / 1024).toFixed(2)}KB`);
            }
          })
          .catch(() => {});
      }
    });
  },
};

export default {
  usePerformanceMonitoring,
  useRenderPerformance,
  useAPIPerformance,
  PerformanceDashboard,
  performanceUtils,
};
