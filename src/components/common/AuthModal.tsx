/**
 * DOSYA AMACI: Giriş / kayıt, e-posta doğrulama ve "Hesabım" akışlarını tek bir
 * ortak `Modal` içinde sunan kabuk bileşen. Görünümler `./auth/` altındadır;
 * burada yalnızca hangi görünümün gösterileceği ve giriş işlemlerinin ortak
 * yürütmesi (busy/hata/kapatma) yer alır. Klavye + d-pad gezintisi ve arka
 * plan engelleme `Modal`'ın `keyboardNav` modundan gelir.
 */

'use client';

import { useState, type ReactNode } from 'react';
import { LogIn, MailCheck, User as UserIcon, UserPlus, Gamepad2, Sparkles } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useT } from '@/contexts/LanguageContext';
import { useMountedModalSound } from '@/services/audio';
import { auth } from '@/services/firebase';
import { Modal } from '@/components/ui';
import { useGameTheme } from '@/game-engine/contexts/GameThemeContext';
import { toMessageKey } from './auth/errors';
import { useVerificationFlow } from './auth/useVerificationFlow';
import { SignInView, type AuthMode, type AuthTab } from './auth/SignInView';
import { VerifyView } from './auth/VerifyView';
import { AccountView } from './auth/AccountView';

interface Props {
  onClose: () => void;
}

export default function AuthModal({ onClose }: Props) {
  const t = useT();
  useMountedModalSound();
  const { theme, themeConfig } = useGameTheme();
  const { user, isAnonymous, linkWithGoogle, linkWithEmail, signOut } = useAuthContext();
  const accent = themeConfig?.accentColor || '#00ff88';
  const isArcade = theme === 'arcade';
  const isCosmic = theme === 'cosmic';

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [authMode, setAuthMode] = useState<AuthMode>('choose');
  const verification = useVerificationFlow({ onClose, setError });

  /**
   * Başarıda modalı kapatır — DOĞRULAMA GEREKMİYORSA. `needsVerification`
   * dönen akışlar modalı açık bırakıp doğrulama panelini gösterir.
   */
  const run = async (fn: () => Promise<{ needsVerification: boolean } | void>) => {
    setBusy(true);
    setError('');
    try {
      const result = await fn();
      if (result && result.needsVerification) return;
      onClose();
    } catch (err) {
      console.error('[AuthModal] Error during auth operation:', err);
      const key = toMessageKey(err);
      if (key) setError(t(key));
    } finally {
      setBusy(false);
    }
  };

  const handleEmail = (credentials: { email: string; password: string }, tab: AuthTab) => {
    run(async () => {
      const result = await linkWithEmail(credentials.email, credentials.password, tab);
      // Oturumsuz yol: signOut edildi, panelin çalışması için kimlik bilgileri
      // bellekte tutulmalı (yeniden gönderim + "doğruladım" geçici signIn ister).
      if (result.needsVerification && auth.currentUser === null) {
        verification.startPending(credentials);
      }
      return result;
    });
  };

  const handleSignOut = () => run(signOut);

  // Doğrulama görünümü imzalı görünümden ÖNCE gelir: doğrulanmamış bir hesap
  // "Hesabım" ekranını (tag yönetimi dahil) görmemeli, çünkü oradaki işlemlerin
  // hepsi sunucuda zaten reddedilir.
  let title: string;
  let icon: ReactNode;
  let subtitle: string | undefined;
  let body: ReactNode;

  if (verification.awaiting) {
    title = t('auth.verify_title');
    icon = <MailCheck size={20} color={accent} />;
    body = (
      <VerifyView flow={verification} error={error} signOutBusy={busy} onSignOut={handleSignOut} />
    );
  } else if (user !== null && !isAnonymous) {
    title = t('auth.my_account');
    icon = <UserIcon size={20} color={accent} />;
    body = <AccountView error={error} signOutBusy={busy} onSignOut={handleSignOut} />;
  } else {
    if (authMode === 'signin') {
      title = t('auth.tab_signin');
      icon = <LogIn size={20} color={accent} />;
      subtitle = t('auth.signin_subtitle');
    } else if (authMode === 'register') {
      title = t('auth.tab_register');
      icon = <UserPlus size={20} color={accent} />;
      subtitle = t('auth.register_subtitle');
    } else {
      title = t('auth.sign_in');
      icon = isArcade ? <Gamepad2 size={20} color={accent} /> : isCosmic ? <Sparkles size={20} color={accent} /> : <LogIn size={20} color={accent} />;
      subtitle = t('auth.save_progress');
    }

    body = (
      <SignInView
        busy={busy}
        error={error}
        setError={setError}
        onGoogle={() => run(linkWithGoogle)}
        onEmail={handleEmail}
        mode={authMode}
        onModeChange={setAuthMode}
      />
    );
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      icon={icon}
      subtitle={subtitle}
      accentColor={accent}
      maxWidth={420}
      maxHeight="90dvh"
      keyboardNav
    >
      {body}
    </Modal>
  );
}
