import React, { memo } from 'react';

/**
 * Memoized StatCard Component
 * Only re-renders when props change
 */
const StatCard = memo(({ title, value, icon: Icon, colorClass, onClick, isLoading }) => {
  return (
    <div 
      className={`stat-card ${colorClass} animate-card-fade`} 
      onClick={onClick} 
      title="Klik untuk melihat detail"
    >
      <div className="stat-card-glow"></div>
      <div className="stat-card-content">
        <div className="stat-info">
          {isLoading ? (
            <div 
              className="skeleton skeleton-bold" 
              style={{ 
                width: '60px', 
                height: '32px', 
                marginBottom: '8px', 
                borderRadius: '8px' 
              }}
            />
          ) : (
            <h3 className="stat-value">{value}</h3>
          )}
          <p className="stat-label">{title}</p>
        </div>
        <div className="stat-icon-outer">
          <div className="stat-icon-inner">
            <Icon size={22} className="stat-icon" />
          </div>
        </div>
      </div>
      <div className="stat-card-progress">
        <div className="progress-bar-fill"></div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function - only re-render if these props change
  return (
    prevProps.value === nextProps.value &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.title === nextProps.title
  );
});

StatCard.displayName = 'StatCard';

export default StatCard;
