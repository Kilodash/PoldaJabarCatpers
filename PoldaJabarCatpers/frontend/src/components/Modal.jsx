import React from 'react';
import { createPortal } from 'react-dom';

const Modal = ({ isOpen, onClose, title, children, position, maxWidth, disableClose = false }) => {
    React.useEffect(() => {
        if (isOpen) {
            document.body.classList.add('modal-open');
        } else {
            document.body.classList.remove('modal-open');
        }
        return () => document.body.classList.remove('modal-open');
    }, [isOpen]);

    if (!isOpen) return null;

    // Use flex positioning to keep it centered horizontally, 
    // but use paddingTop to match the mouse Y coordinate vertically.
    const overlayStyle = position ? {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingTop: `${Math.max(20, Math.min(window.innerHeight - 500, position.y - 100))}px`,
        background: 'rgba(11, 36, 71, 0.2)',
        overflowY: 'auto',
        zIndex: 10000
    } : {
        zIndex: 10000
    };

    const containerStyle = position ? {
        width: '100%',
        maxWidth: '450px', // Maximum width for contextual modals
        margin: '0 0.5rem',
        zIndex: 10001,
        position: 'relative'
    } : {
        width: '100%',
        maxWidth: maxWidth || '900px',
        zIndex: 10001
    };

    const modalJSX = (
        <div className="modal-overlay" style={overlayStyle} onClick={() => !disableClose && onClose()}>
            <div
                className="modal-container animate-fade-in"
                style={containerStyle}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
            >
                <div className="modal-header no-print">
                    <h3 id="modal-title">{title}</h3>
                    <button
                        className="modal-close"
                        onClick={() => !disableClose && onClose()}
                        disabled={disableClose}
                        aria-label="Close"
                    >
                        &times;
                    </button>
                </div>
                <div className="modal-content">
                    {children}
                </div>
            </div>
        </div>
    );

    return createPortal(modalJSX, document.body);
};

export default Modal;
