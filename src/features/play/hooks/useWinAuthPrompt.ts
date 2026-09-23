'use client';

import { useState } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';

/**
 * Anonim kullanıcıya "skoru kaydetmek için giriş yap" akışı: AuthModal kapandıktan
 * sonra hâlâ anonimse `loginFailed` gösterilir.
 */
export function useWinAuthPrompt() {
    const { user, isAnonymous } = useAuthContext();
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [authAttempted, setAuthAttempted] = useState(false);

    const isUserAnonymous = !user || isAnonymous;

    // `loginFailed` ayrı bir state DEĞİL, üç bilinen değerin türevi: denendi mi,
    // modal kapandı mı, kullanıcı hâlâ anonim mi. Efektte set edilmesi hem fazladan
    // bir render turu hem de "bir kare doğru sonra yanlış" yanıp sönmesi demekti.
    const loginFailed = authAttempted && !showAuthModal && isUserAnonymous;

    const handleOpenAuth = () => {
        setAuthAttempted(true);
        setShowAuthModal(true);
    };

    const closeAuthModal = () => setShowAuthModal(false);

    return { isUserAnonymous, showAuthModal, loginFailed, handleOpenAuth, closeAuthModal };
}
