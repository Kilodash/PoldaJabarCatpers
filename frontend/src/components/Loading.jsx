import React from 'react';
import './Loading.css';

const Loading = ({ variant = 'full', text = 'Memuat Data...', className = '' }) => {
    if (variant === 'full') {
        return (
            <div className={`loading-full-overlay ${className}`}>
                <div className="police-loader"></div>
                <div className="loading-text">{text}</div>
            </div>
        );
    }

    if (variant === 'inline') {
        return (
            <div className={`loading-inline ${className}`}>
                <div className="spinner-sm"></div>
                {text && <span>{text}</span>}
            </div>
        );
    }

    if (variant === 'skeleton') {
        return <div className={`skeleton ${className}`}></div>;
    }

    if (variant === 'skeleton-list') {
        return (
            <div className={`flex flex-col gap-3 ${className}`}>
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="skeleton skeleton-text" style={{ width: i % 2 === 0 ? '100%' : '85%' }}></div>
                ))}
            </div>
        );
    }

    return null;
};

export default Loading;
