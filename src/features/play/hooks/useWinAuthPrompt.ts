'use client';

import { useEffect, useState } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';

/**
 * Anonim kullanıcıya "skoru kaydetmek için giriş yap" akışı: AuthModal kapandıktan
 * sonra hâlâ anonimse `loginFailed` gösterilir.
 */
export function useWinAuthPrompt() {
    const { user, isAnonymous } = useAuthContext();
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [authAttempted, setAuthAttempted] = useState(false);
    const [loginFailed, setLoginFailed] = useState(false);

    const isUserAnonymous = !user || isAnonymous;

    // Check auth status after AuthModal is closed
    useEffect(() => {
        if (authAttempted && !showAuthModal) {
            if (!user || isAnonymous) {
                setLoginFailed(true);
            } else {
                setLoginFailed(false);
                setAuthAttempted(false);
            }
        }
    }, [showAuthModal, user, isAnonymous, authAttempted]);

    const handleOpenAuth = () => {
        setAuthAttempted(true);
        setLoginFailed(false);
        setShowAuthModal(true);
    };

    const closeAuthModal = () => setShowAuthModal(false);

    return { isUserAnonymous, showAuthModal, loginFailed, handleOpenAuth, closeAuthModal };
}
