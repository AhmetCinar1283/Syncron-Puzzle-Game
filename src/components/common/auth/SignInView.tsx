'use client';

import { useState, type FormEvent } from 'react';
import {
  Sparkles,
  LogIn,
  UserPlus,
  ChevronRight,
  ArrowLeft,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useT } from '@/contexts/LanguageContext';
import { useGameTheme } from '@/game-engine/contexts/GameThemeContext';
import { GoogleIcon } from './GoogleIcon';

export type AuthMode = 'choose' | 'signin' | 'register';
export type AuthTab = 'signin' | 'register';

interface Props {
  busy: boolean;
  error: string;
  setError: (message: string) => void;
  onGoogle: () => void;
  onEmail: (credentials: { email: string; password: string }, tab: AuthTab) => void;
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
}

/**
 * Kullanıcıyı adım adım yönlendiren giriş ve kayıt görünümü:
 * - 'choose': Google ile hızlı giriş (önerilen) veya e-posta seçenekleri
 * - 'signin': Yalnızca e-posta ve şifre ile giriş formu
 * - 'register': E-posta, şifre ve yasal onay ile yeni hesap formu
 */
export function SignInView({
  busy,
  error,
  setError,
  onGoogle,
  onEmail,
  mode,
  onModeChange,
}: Props) {
  const t = useT();
  const { themeConfig } = useGameTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const requireTerms = () => {
    if (acceptedTerms) return true;
    setError(t('auth.err_terms_required'));
    return false;
  };

  const handleGoogle = () => {
    if (!requireTerms()) return;
    localStorage.setItem('accepted_terms', 'true');
    onGoogle();
  };

  const handleSignInSubmit = (e: FormEvent) => {
    e.preventDefault();
    onEmail({ email, password }, 'signin');
  };

  const handleRegisterSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!requireTerms()) return;
    localStorage.setItem('accepted_terms', 'true');
    onEmail({ email, password }, 'register');
  };

  const termsError = error === t('auth.err_terms_required');

  const toggleTerms = () => {
    setAcceptedTerms((prev) => {
      const next = !prev;
      if (next && termsError) {
        setError('');
      }
      return next;
    });
  };

  const termsCheckbox = (
    <label
      className={`home-sheet__check ${termsError ? 'home-sheet__check--error' : ''}`}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('a')) return;
        if ((e.target as HTMLElement).tagName.toLowerCase() === 'input') return;
        toggleTerms();
      }}
    >
      <input
        type="checkbox"
        checked={acceptedTerms}
        onChange={(e) => {
          setAcceptedTerms(e.target.checked);
          if (e.target.checked && termsError) {
            setError('');
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            toggleTerms();
          }
        }}
      />
      <span>
        {t('auth.terms_checkbox_text_1')}
        <a
          className="home-sheet__link"
          href="/terms"
          target="_blank"
          rel="noopener noreferrer"
          tabIndex={-1}
          data-nav-skip
        >
          {t('auth.terms_checkbox_text_2')}
        </a>
        {t('auth.terms_checkbox_text_3')}
        <a
          className="home-sheet__link"
          href="/privacy"
          target="_blank"
          rel="noopener noreferrer"
          tabIndex={-1}
          data-nav-skip
        >
          {t('auth.terms_checkbox_text_4')}
        </a>
        {t('auth.terms_checkbox_text_5')}
        <a
          className="home-sheet__link"
          href="/kvkk"
          target="_blank"
          rel="noopener noreferrer"
          tabIndex={-1}
          data-nav-skip
        >
          {t('auth.terms_checkbox_text_6')}
        </a>
        {t('auth.terms_checkbox_text_7')}
      </span>
    </label>
  );

  // 1. SEÇİM VE YÖNLENDİRME EKRANI
  if (mode === 'choose') {
    return (
      <div className="home-sheet__stack">
        {/* Google ile Hızlı Giriş (Önerilen) */}
        <div className="home-sheet__auth-hero">
          <div className="home-sheet__auth-badge">
            <Sparkles size={12} />
            <span>{t('auth.recommended')}</span>
          </div>

          <button
            type="button"
            className="home-sheet__btn home-sheet__btn--google-game"
            data-variant="google-game"
            data-autofocus
            onClick={handleGoogle}
            disabled={busy}
          >
            <div className="home-sheet__btn-google-inner">
              <GoogleIcon />
              <span className="home-sheet__btn-google-text">{t('auth.continue_google')}</span>
            </div>
            <span className="home-sheet__btn-google-tag">⚡ FAST</span>
          </button>

          {termsCheckbox}

          {error && (
            <div className="home-sheet__alert-box" role="alert">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* E-posta ile devam etme seçenekleri */}
        <div className="home-sheet__divider">{t('auth.or_email')}</div>

        <div className="home-sheet__stack">
          <button
            type="button"
            className="home-sheet__auth-card"
            onClick={() => {
              setError('');
              onModeChange('signin');
            }}
            disabled={busy}
          >
            <div className="home-sheet__auth-card-icon">
              <LogIn size={20} />
            </div>
            <div className="home-sheet__auth-card-content">
              <p className="home-sheet__auth-card-title">{t('auth.email_signin_btn')}</p>
              <p className="home-sheet__auth-card-desc">{t('auth.email_signin_desc')}</p>
            </div>
            <ChevronRight size={18} className="home-sheet__auth-card-arrow" />
          </button>

          <button
            type="button"
            className="home-sheet__auth-card"
            onClick={() => {
              setError('');
              onModeChange('register');
            }}
            disabled={busy}
          >
            <div className="home-sheet__auth-card-icon">
              <UserPlus size={20} />
            </div>
            <div className="home-sheet__auth-card-content">
              <p className="home-sheet__auth-card-title">{t('auth.email_register_btn')}</p>
              <p className="home-sheet__auth-card-desc">{t('auth.email_register_desc')}</p>
            </div>
            <ChevronRight size={18} className="home-sheet__auth-card-arrow" />
          </button>
        </div>
      </div>
    );
  }

  // 2. E-POSTA İLE GİRİŞ EKRANI
  if (mode === 'signin') {
    return (
      <div className="home-sheet__stack">
        <div className="home-sheet__auth-nav">
          <button
            type="button"
            className="home-sheet__auth-back"
            onClick={() => {
              setError('');
              onModeChange('choose');
            }}
          >
            <ArrowLeft size={16} />
            <span>{t('common.back')}</span>
          </button>
          <div className="home-sheet__theme-pill">
            <span className="home-sheet__theme-pill-dot" />
            <span>{themeConfig?.defaultName}</span>
          </div>
        </div>

        <form onSubmit={handleSignInSubmit} className="home-sheet__stack">
          <div>
            <label className="home-sheet__label" htmlFor="auth-signin-email" style={{ marginBottom: 6, display: 'block' }}>
              {t('auth.email')}
            </label>
            <input
              id="auth-signin-email"
              type="email"
              className="home-sheet__input"
              placeholder="ornek@email.com"
              autoComplete="email"
              data-autofocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="home-sheet__label" htmlFor="auth-signin-password" style={{ marginBottom: 6, display: 'block' }}>
              {t('auth.password')}
            </label>
            <div className="home-sheet__input-wrap">
              <input
                id="auth-signin-password"
                type={showPassword ? 'text' : 'password'}
                className="home-sheet__input"
                placeholder="••••••••"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="home-sheet__input-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? t('auth.hide_password') : t('auth.show_password')}
                title={showPassword ? t('auth.hide_password') : t('auth.show_password')}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="home-sheet__alert-box" role="alert">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="home-sheet__btn"
            data-variant="primary"
            disabled={busy || !email || !password}
          >
            {busy ? '...' : t('auth.tab_signin')}
          </button>
        </form>

        <div className="home-sheet__footer-switch">
          <span>{t('auth.no_account')}</span>
          <button
            type="button"
            className="home-sheet__switch-btn"
            onClick={() => {
              setError('');
              onModeChange('register');
            }}
          >
            {t('auth.sign_up_link')}
          </button>
        </div>
      </div>
    );
  }

  // 3. YENİ HESAP OLUŞTURMA EKRANI
  return (
    <div className="home-sheet__stack">
      <div className="home-sheet__auth-nav">
        <button
          type="button"
          className="home-sheet__auth-back"
          onClick={() => {
            setError('');
            onModeChange('choose');
          }}
        >
          <ArrowLeft size={16} />
          <span>{t('common.back')}</span>
        </button>
        <div className="home-sheet__theme-pill">
          <span className="home-sheet__theme-pill-dot" />
          <span>{themeConfig?.defaultName}</span>
        </div>
      </div>

      <form onSubmit={handleRegisterSubmit} className="home-sheet__stack">
        <div>
          <label className="home-sheet__label" htmlFor="auth-register-email" style={{ marginBottom: 6, display: 'block' }}>
            {t('auth.email')}
          </label>
          <input
            id="auth-register-email"
            type="email"
            className="home-sheet__input"
            placeholder="ornek@email.com"
            autoComplete="email"
            data-autofocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="home-sheet__label" htmlFor="auth-register-password" style={{ marginBottom: 6, display: 'block' }}>
            {t('auth.password')}
          </label>
          <div className="home-sheet__input-wrap">
            <input
              id="auth-register-password"
              type={showPassword ? 'text' : 'password'}
              className="home-sheet__input"
              placeholder="••••••••"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
            <button
              type="button"
              className="home-sheet__input-toggle"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? t('auth.hide_password') : t('auth.show_password')}
              title={showPassword ? t('auth.hide_password') : t('auth.show_password')}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p className="home-sheet__text home-sheet__text--dim" style={{ marginTop: 4 }}>
            {t('auth.password_min_hint')}
          </p>
        </div>

        {termsCheckbox}

        {error && (
          <div className="home-sheet__alert-box" role="alert">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          className="home-sheet__btn"
          data-variant="primary"
          disabled={busy || !email || !password}
        >
          {busy ? '...' : t('auth.tab_register')}
        </button>
      </form>

      <div className="home-sheet__footer-switch">
        <span>{t('auth.have_account')}</span>
        <button
          type="button"
          className="home-sheet__switch-btn"
          onClick={() => {
            setError('');
            onModeChange('signin');
          }}
        >
          {t('auth.sign_in_link')}
        </button>
      </div>
    </div>
  );
}
