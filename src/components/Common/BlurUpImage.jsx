import React, { useState } from 'react';

/**
 * Premium Image Component with Blur-Up Transition & Fallback
 * - 16px radius (rounded-2xl)
 * - Smooth 250ms fade & blur-out transition on load
 * - Respects prefers-reduced-motion
 * - High performance lazy-loading (decoding="async")
 */
export default function BlurUpImage({
  src,
  alt = '',
  className = '',
  containerClassName = '',
  aspectRatio = 'aspect-[16/10]',
  fallbackSrc = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
  ...props
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const activeSrc = hasError || !src ? fallbackSrc : src;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-[#FFF1E6] dark:bg-[#2C221A] ${aspectRatio} ${containerClassName}`}
    >
      {/* Warm Blur-Up Skeleton Base */}
      <div
        className={`absolute inset-0 bg-gradient-to-tr from-[#FFF1E6] via-[#FFE6D4] to-[#FFF9F2] dark:from-[#2C221A] dark:via-[#35291F] dark:to-[#221A14] transition-opacity duration-300 motion-reduce:transition-none pointer-events-none ${
          isLoaded ? 'opacity-0' : 'opacity-100 animate-pulse'
        }`}
        aria-hidden="true"
      />

      {/* Main Image */}
      <img
        src={activeSrc}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          if (!hasError) setHasError(true);
          setIsLoaded(true);
        }}
        className={`w-full h-full object-cover rounded-2xl transition-all duration-300 ease-out motion-reduce:transition-none ${
          isLoaded ? 'opacity-100 blur-0 scale-100' : 'opacity-0 blur-md scale-105'
        } ${className}`}
        {...props}
      />
    </div>
  );
}
