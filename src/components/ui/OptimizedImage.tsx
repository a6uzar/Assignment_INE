import { useState, useRef, useEffect, memo } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  placeholder?: string;
  priority?: boolean;
  onLoad?: () => void;
  onError?: () => void;
}

export const OptimizedImage = memo(({
  src,
  alt,
  width,
  height,
  className,
  placeholder = '/placeholder.svg',
  priority = false,
  onLoad,
  onError,
}: OptimizedImageProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const imgRef = useRef<HTMLImageElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [priority]);

  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  };

  const generateSrcSet = (baseSrc: string) => {
    // In production, you would generate different sizes
    // For now, we'll use the same image
    return `${baseSrc} 1x, ${baseSrc} 2x`;
  };

  return (
    <div
      ref={imgRef}
      className={cn(
        'relative overflow-hidden bg-gray-100',
        className
      )}
      style={{ width, height }}
    >
      {/* Loading placeholder */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
        </div>
      )}

      {/* Main image */}
      {isInView && (
        <img
          src={hasError ? placeholder : src}
          alt={alt}
          width={width}
          height={height}
          srcSet={hasError ? undefined : generateSrcSet(src)}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            'transition-opacity duration-300 object-cover w-full h-full',
            isLoading ? 'opacity-0' : 'opacity-100'
          )}
        />
      )}

      {/* Error state */}
      {hasError && !isLoading && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
          Failed to load image
        </div>
      )}
    </div>
  );
});

OptimizedImage.displayName = 'OptimizedImage';

// Progressive Image Component with blur placeholder
export const ProgressiveImage = memo(({
  src,
  alt,
  width,
  height,
  className,
  blurDataURL,
  ...props
}: OptimizedImageProps & { blurDataURL?: string }) => {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className={cn('relative overflow-hidden', className)} style={{ width, height }}>
      {/* Blur placeholder */}
      {blurDataURL && !isLoaded && (
        <img
          src={blurDataURL}
          alt=""
          className="absolute inset-0 w-full h-full object-cover filter blur-sm scale-110"
          aria-hidden="true"
        />
      )}

      {/* Main image */}
      <OptimizedImage
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={cn(
          'transition-opacity duration-500',
          isLoaded ? 'opacity-100' : 'opacity-0'
        )}
        onLoad={() => setIsLoaded(true)}
        {...props}
      />
    </div>
  );
});

ProgressiveImage.displayName = 'ProgressiveImage';

// Image gallery with optimized loading
interface ImageGalleryProps {
  images: Array<{
    id: string;
    src: string;
    alt: string;
    thumbnail?: string;
  }>;
  className?: string;
}

export const ImageGallery = memo(({ images, className }: ImageGalleryProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set([0])); // Load first image by default

  const handleThumbnailClick = (index: number) => {
    setSelectedIndex(index);
    setLoadedImages(prev => new Set(prev).add(index));
  };

  // Preload adjacent images
  useEffect(() => {
    const preloadIndices = [
      selectedIndex - 1,
      selectedIndex,
      selectedIndex + 1,
    ].filter(i => i >= 0 && i < images.length);

    preloadIndices.forEach(index => {
      setLoadedImages(prev => new Set(prev).add(index));
    });
  }, [selectedIndex, images.length]);

  if (images.length === 0) return null;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Main image */}
      <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
        <OptimizedImage
          src={images[selectedIndex].src}
          alt={images[selectedIndex].alt}
          className="w-full h-full object-cover"
          priority={selectedIndex === 0}
        />
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {images.map((image, index) => (
            <button
              key={image.id}
              onClick={() => handleThumbnailClick(index)}
              className={cn(
                'flex-shrink-0 w-16 h-16 rounded border-2 overflow-hidden transition-all',
                selectedIndex === index
                  ? 'border-blue-500 ring-2 ring-blue-200'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              {loadedImages.has(index) ? (
                <OptimizedImage
                  src={image.thumbnail || image.src}
                  alt={image.alt}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 animate-pulse" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

ImageGallery.displayName = 'ImageGallery';

// Hook for image preloading
export function useImagePreload(urls: string[]) {
  const [loadedUrls, setLoadedUrls] = useState<Set<string>>(new Set());

  useEffect(() => {
    urls.forEach(url => {
      const img = new Image();
      img.onload = () => {
        setLoadedUrls(prev => new Set(prev).add(url));
      };
      img.src = url;
    });
  }, [urls]);

  return loadedUrls;
}

// Utility to generate placeholder data URLs
export function generatePlaceholderDataURL(width: number, height: number, color = '#f3f4f6') {
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${color}"/>
    </svg>
  `;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
