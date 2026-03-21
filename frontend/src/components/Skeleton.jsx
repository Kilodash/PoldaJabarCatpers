import React from 'react';

// Base Skeleton component
export const Skeleton = ({ width = '100%', height = '20px', borderRadius = '4px', className = '' }) => (
  <div
    className={`animate-pulse bg-gray-200 ${className}`}
    style={{
      width,
      height,
      borderRadius,
      background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite'
    }}
  />
);

// Skeleton for StatCard
export const SkeletonStatCard = () => (
  <div className="stat-card" style={{ minHeight: '120px', position: 'relative' }}>
    <div className="stat-card-content">
      <div className="stat-info">
        <Skeleton width="80px" height="36px" borderRadius="8px" style={{ marginBottom: '12px' }} />
        <Skeleton width="120px" height="16px" borderRadius="4px" />
      </div>
      <div className="stat-icon-outer">
        <Skeleton width="48px" height="48px" borderRadius="8px" />
      </div>
    </div>
  </div>
);

// Skeleton for Table Row
export const SkeletonTableRow = ({ columns = 5 }) => (
  <tr>
    {Array.from({ length: columns }).map((_, idx) => (
      <td key={idx}>
        <Skeleton
          width={idx === 0 ? '40px' : '70%'}
          height="20px"
          borderRadius="4px"
        />
      </td>
    ))}
  </tr>
);

// Skeleton for Badge
export const SkeletonBadge = () => (
  <Skeleton width="40px" height="24px" borderRadius="12px" style={{ margin: '0 auto' }} />
);

// Skeleton for Card
export const SkeletonCard = () => (
  <div style={{
    background: 'white',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
  }}>
    <Skeleton width="60%" height="24px" borderRadius="6px" style={{ marginBottom: '12px' }} />
    <Skeleton width="100%" height="16px" borderRadius="4px" style={{ marginBottom: '8px' }} />
    <Skeleton width="80%" height="16px" borderRadius="4px" style={{ marginBottom: '8px' }} />
    <Skeleton width="90%" height="16px" borderRadius="4px" />
  </div>
);

// Skeleton List (for loading multiple items)
export const SkeletonList = ({ count = 5, gap = '1rem' }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap }}>
    {Array.from({ length: count }).map((_, idx) => (
      <SkeletonCard key={idx} />
    ))}
  </div>
);

// Add shimmer animation to index.css
const shimmerStyles = `
  @keyframes shimmer {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }
`;

// Inject styles if not already present
if (typeof document !== 'undefined') {
  const styleId = 'skeleton-shimmer-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = shimmerStyles;
    document.head.appendChild(style);
  }
}

export default Skeleton;
