// Utility functions for the performance monitoring system

export interface PerformanceEntry {
  name: string;
  entryType: string;
  startTime: number;
  duration: number;
}

export interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

export type FunctionType = (...args: unknown[]) => unknown;

// Debounce function for reducing API calls
export const debounce = <T extends FunctionType>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Throttle function for scroll/resize events
export const throttle = <T extends FunctionType>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// Safe error handler
export const handleError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
};

// Memory usage utility
export const getMemoryUsage = (): MemoryInfo | null => {
  if ('memory' in performance) {
    return (performance as typeof performance & { memory: MemoryInfo }).memory;
  }
  return null;
};

// Performance measurement utility
export const measurePerformance = async <T>(
  name: string,
  fn: () => Promise<T> | T
): Promise<{ result: T; duration: number }> => {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`${name}: ${duration.toFixed(2)}ms`);
  }
  
  return { result, duration };
};

// Type-safe function caller
export const safeCall = <T extends FunctionType>(
  fn: T | undefined,
  ...args: Parameters<T>
): ReturnType<T> | undefined => {
  if (typeof fn === 'function') {
    return fn(...args) as ReturnType<T>;
  }
  return undefined;
};

export default {
  debounce,
  throttle,
  handleError,
  getMemoryUsage,
  measurePerformance,
  safeCall,
};
