import React from 'react';

interface SkeletonLoaderProps {
  className?: string;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ className = '' }) => {
  return (
    <div className={`skeleton-loader ${className}`} role="status" aria-label="Loading content">
      {/* Document Title Skeleton */}
      <div className="skeleton-title mb-6">
        <div className="skeleton-line h-8 w-3/4 mb-2"></div>
        <div className="skeleton-line h-4 w-1/2"></div>
      </div>

      {/* Paragraph Skeletons */}
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="skeleton-paragraph mb-4">
          <div className="skeleton-line h-4 w-full mb-2"></div>
          <div className="skeleton-line h-4 w-11/12 mb-2"></div>
          <div className="skeleton-line h-4 w-4/5 mb-2"></div>
          <div className="skeleton-line h-4 w-5/6"></div>
        </div>
      ))}

      {/* Section Header Skeleton */}
      <div className="skeleton-section mt-8 mb-4">
        <div className="skeleton-line h-6 w-2/3"></div>
      </div>

      {/* More Paragraph Skeletons */}
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i + 8} className="skeleton-paragraph mb-4">
          <div className="skeleton-line h-4 w-full mb-2"></div>
          <div className="skeleton-line h-4 w-10/12 mb-2"></div>
          <div className="skeleton-line h-4 w-3/4"></div>
        </div>
      ))}

      {/* Comment/Footnote Placeholders */}
      <div className="skeleton-comments mt-6">
        <div className="skeleton-line h-3 w-1/4 mb-2 opacity-60"></div>
        <div className="skeleton-line h-3 w-1/3 opacity-60"></div>
      </div>

      {/* Screen reader announcement */}
      <span className="sr-only">Loading document content...</span>
    </div>
  );
};

export default SkeletonLoader; 