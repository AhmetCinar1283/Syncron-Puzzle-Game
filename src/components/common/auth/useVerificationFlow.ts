'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth } from '@/services/firebase';
import { useAuthContext } from '@/contexts/AuthContext';
import { useT, useLanguage } from '@/contexts/LanguageContext';
import {
  getActionCodeSettings,
  markVerificationSent,
  verificationCooldownRemaining,
} from '@/services/auth/verification';
import { toMessageKey } from './errors';

interface Options {
  onClose: () => void;
  setError: (message: string) => void;
}

interface PendingVerification {
  email: string;
  password: string;
}

/**
 * E-posta doğrulama bekleyişinin durumu ve işlemleri.
 *
 * Oturumsuz bekleyiş: kayıt/giriş sonrası signOut edildiği için `user` null'dur
 * ve doğrulama panelini gösterecek başka bir sinyal yoktur. Şifre YALNIZCA
 * bellekte tutulur (yeniden gönderim ve "doğruladım" için geçici bir signIn
 * gerekiyor) — localStorage'a asla yazılmaz.
 */
export function useVerificationFlow({ onClose, setError }: Options) {
  const t = useT();
  const { lang } = useLanguage();
  const { user, isAnonymous, emailVerified, refreshVerification, resendVerification } = useAuthContext();

  const [pending, setPending] = useState<PendingVerification | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [cooldownMs, setCooldownMs] = useState(0);

  const awaiting = Boolean(pending) || (user !== null && !isAnonymous && !emailVerified);
  const cooldownSubject = pending?.email.toLowerCase() ?? user?.uid ?? '';
  const targetEmail = pending?.email ?? user?.email ?? '';

  // Geri sayım tıklayıcısı — yalnızca doğrulama beklenirken çalışır.
  useEffect(() => {
    if (!awaiting || !cooldownSubject) return;
    const tick = () => setCooldownMs(verificationCooldownRemaining(cooldownSubject));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [awaiting, cooldownSubject]);

  const fail = useCallback(
    (err: unknown) => {
      const key = toMessageKey(err);
      if (key) setError(t(key));
    },
    [setError, t],
  );

  const begin = () => {
    setBusy(true);
    setError('');
    setNotice('');
  };

  /** Oturumsuz bekleyiş için kimlik bilgilerini belleğe alır. */
  const startPending = useCallback((creds: PendingVerification) => setPending(creds), []);

  /** Bekleyişten çıkıp giriş görünümüne döner. */
  const cancelPending = useCallback(() => {
    setPending(null);
    setNotice('');
    setError('');
  }, [setError]);

  /** Oturumsuz bekleyişte: geçici giriş → e-posta gönder → tekrar çıkış. */
  const resendSignedOut = async () => {
    if (!pending) return;
    begin();
    try {
      const cred = await signInWithEmailAndPassword(auth, pending.email, pending.password);
      auth.languageCode = lang;
      await sendEmailVerification(cred.user, getActionCodeSettings());
      markVerificationSent(pending.email.toLowerCase());
      setCooldownMs(verificationCooldownRemaining(pending.email.toLowerCase()));
      setNotice(t('auth.verify_resent'));
    } catch (err) {
      fail(err);
    } finally {
      // Doğrulanmadan oturum açık kalmamalı — hata olsa da kapat.
      await firebaseSignOut(auth).catch(() => {});
      setBusy(false);
    }
  };

  /** Oturumlu (anonimden yükselmiş) bekleyişte: doğrudan yeniden gönder. */
  const resendSignedIn = async () => {
    begin();
    try {
      await resendVerification();
      if (user) setCooldownMs(verificationCooldownRemaining(user.uid));
      setNotice(t('auth.verify_resent'));
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  /**
   * "Doğruladım". Oturumsuz bekleyişte yeniden giriş dener: doğrulanmışsa
   * oturum AÇIK KALIR ve modal kapanır, değilse tekrar çıkış yapılır.
   */
  const check = async () => {
    begin();
    try {
      if (pending) {
        const cred = await signInWithEmailAndPassword(auth, pending.email, pending.password);
        await cred.user.reload();
        if (auth.currentUser?.emailVerified) {
          await auth.currentUser.getIdToken(true);
          setPending(null);
          onClose();
          return;
        }
        await firebaseSignOut(auth);
        setNotice(t('auth.verify_not_yet'));
        return;
      }
      const ok = await refreshVerification();
      if (!ok) setNotice(t('auth.verify_not_yet'));
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  return {
    awaiting,
    signedOutPending: Boolean(pending),
    targetEmail,
    busy,
    notice,
    cooldownMs,
    startPending,
    cancelPending,
    resend: pending ? resendSignedOut : resendSignedIn,
    check,
  };
}
