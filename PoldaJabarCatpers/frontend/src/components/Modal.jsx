import React from 'react';
import { createPortal } from 'react-dom';

const Modal = ({ isOpen, onClose, title, children, position, maxWidth }) => {
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
        width: '450px', // Hardcoded width for small contextual modals (Satker, etc)
        margin: '0 1rem',
        zIndex: 10001,
        position: 'relative'
    } : {
        maxWidth: maxWidth || '900px', // Fallback to CSS default if not provided
        zIndex: 10001
    };

    const modalJSX = (
        <div className="modal-overlay" style={overlayStyle} onClick={onClose}>
            <div
                className="modal-container animate-fade-in"
                style={containerStyle}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="modal-header no-print">
                    <h3>{title}</h3>
                    <button className="modal-close" onClick={onClose}>&times;</button>
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
