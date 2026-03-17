import React from 'react';
import { createPortal } from 'react-dom';

const Modal = ({ isOpen, onClose, title, children, position, maxWidth, disableClose = false }) => {
    React.useEffect(() => {
        if (isOpen) {
            document.body.classList.add('modal-open');
            
            // Push a dummy state to history so back button closes modal
            const modalState = { modalId: title || 'modal' };
            window.history.pushState(modalState, '');

            const handlePopState = () => {
                if (isOpen && !disableClose) {
                    onClose();
                }
            };

            window.addEventListener('popstate', handlePopState);

            return () => {
                document.body.classList.remove('modal-open');
                window.removeEventListener('popstate', handlePopState);
                
                // If the modal was closed manually (not via back button), 
                // we should clean up the history state we pushed.
                if (window.history.state && window.history.state.modalId === (title || 'modal')) {
                    window.history.back();
                }
            };
        }
    }, [isOpen, onClose, title, disableClose]);

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
