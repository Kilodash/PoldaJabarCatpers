import { useState, useCallback, useEffect } from 'react';

/**
 * useModal Hook
 * Manages a stack of modals with browser history integration.
 */
export const useModal = () => {
    const [modalStack, setModalStack] = useState([]);

    const openModal = useCallback((type, props = {}) => {
        const id = `modal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newModal = { id, type, props };
        
        setModalStack(prev => [...prev, newModal]);
        window.history.pushState({ modalId: id }, '');
    }, []);

    const closeModal = useCallback(() => {
        setModalStack(prev => {
            if (prev.length === 0) return prev;
            const newStack = [...prev];
            newStack.pop();
            return newStack;
        });
    }, []);

    const closeAllModals = useCallback(() => {
        setModalStack([]);
        // We don't go back in history here to avoid unwanted navigation 
        // unless we want to clear the entire stack from history too.
    }, []);

    useEffect(() => {
        const handlePopState = (event) => {
            // If historical state exists, it means we might be going back
            // If it doesn't match our top modal, we pop.
            setModalStack(prev => {
                if (prev.length === 0) return prev;
                const newStack = [...prev];
                newStack.pop();
                return newStack;
            });
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    return {
        modalStack,
        openModal,
        closeModal,
        closeAllModals,
        isAnyModalOpen: modalStack.length > 0
    };
};
