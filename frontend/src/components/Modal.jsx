import React from 'react';
import { createPortal } from 'react-dom';

const Modal = ({ 
    isOpen, 
    onClose, 
    title, 
    children, 
    maxWidth, 
    zIndex = 10000,
    showClose = true
}) => {
    if (!isOpen) return null;

    return createPortal(
        <div 
            className="modal-overlay" 
            style={{ zIndex }} 
            onClick={onClose}
        >
            <div
                className="modal-container glass-panel animate-modal-enter"
                style={{ 
                    maxWidth: maxWidth || '900px',
                    zIndex: zIndex + 1
                }}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                <div className="modal-header no-print">
                    <h3>{title}</h3>
                    {showClose && (
                        <button
                            className="modal-close"
                            onClick={onClose}
                            aria-label="Close"
                        >
                            &times;
                        </button>
                    )}
                </div>
                <div className="modal-content">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default Modal;
