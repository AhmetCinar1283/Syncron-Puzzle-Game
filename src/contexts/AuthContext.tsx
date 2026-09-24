/**
 * DOSYA AMACI: Bu dosya, Firebase Auth kullanarak kullanıcının oturum durumunu (anonim, google, email), 
 * rolünü ('admin', 'moderator', 'user') ve oturum açma/bağlama/çıkış fonksiyonlarını yöneten AuthContext yapısını içerir.
 */

'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  linkWithPopup,
  linkWithCredential,
  getRedirectResult,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithCredential,
  GoogleAuthProvider,
  EmailAuthProvider,
  type User,
} from 'firebase/auth';
import { auth } from '@/services/firebase';
import { getActionCodeSettings, markVerificationSent } from '@/services/auth/verification';
import { settingsService } from '@/services/settings';
import { createOrUpdateUserDoc, getUserDocSnapshot, type UserDoc } from '@/services/firebase/firestore';
import { clearPlayedLevelsForUserSwitch } from '@/services/sync/playedLevels';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '@/store';
import { setAuthUser, setFirestoreData, resetUser } from '@/store/userSlice';
import type { AuthProvider as AuthProviderType, UserRole } from '@/store/userSlice';

// ─── Types ────────────────────────────────────────────────────────────────────

export type { UserRole };

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** True when running inside a Capacitor native app (Android/iOS). */
// Uygulamanın Capacitor (Android/iOS) üzerinde çalışıp çalışmadığını tespit eder.
function isNativePlatform(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as any).Capacitor;
  return !!(cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform());
}

// Kullanıcının oturum açma yöntemini (anonim, google, email) çözümler.
function resolveAuthProvider(user: User): AuthProviderType {
  if (user.isAnonymous) return 'anonymous';
  const providerIds = user.providerData.map((p) => p.providerId);
  if (providerIds.includes('google.com')) return 'google';
  return 'email';
}

// ─── Context shape ─────────────────────────────────────────────────────────────

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  /**
   * True only when the user has an active ANONYMOUS Firebase Auth session
   * (i.e. `user.isAnonymous === true`). False when the user is fully signed
   * out (unauthenticated) — use `isUnauthenticated` for that case.
   */
  isAnonymous: boolean;
  /**
   * True when there is NO active session at all (user === null).
   * Distinct from `isAnonymous`, which requires an anonymous Auth account.
   */
  isUnauthenticated: boolean;
  /**
   * E-posta sahipliği kanıtlanmış mı. Google hesapları ilk token'da zaten
   * `true` gelir; anonim oturumlarda her zaman `false`.
   *
   * `user.emailVerified`'ın TÜRETİLMİŞ hali DEĞİL, kendi state dilimi:
   * `user.reload()` aynı `User` nesnesini yerinde mutasyona uğrattığı için
   * `setUser(auth.currentUser)` kimlik olarak no-op'tur ve efektleri yeniden
   * çalıştırmaz. Bu yüzden ayrı state olmak zorunda.
   */
  emailVerified: boolean;
  role: UserRole;
  isModerator: boolean;
  /**
   * Links the anonymous account to Google.
   * - Web/Electron: popup
   * - Capacitor: redirect (result handled on next app open)
   * If the Google account is already registered, signs in to that account instead.
   */
  linkWithGoogle: () => Promise<void>;
  /**
   * E-posta + şifre ile kayıt/giriş. E-posta sahipliği kanıtlanmadan hiçbir
   * ayrıcalık verilmez — iki ayrı yol vardır:
   *
   * - `register` + anonim oturum → `linkWithCredential`. Oturum KORUNUR
   *   (UID ve oyun ilerlemesi aynı kalır) ama doğrulanana dek anonim
   *   seviye haklarıyla sınırlıdır.
   * - `register` / `signin` + oturumsuz → doğrulama e-postası gönderilir ve
   *   ANINDA `signOut` edilir. Doğrulanmadan oturum açılmaz.
   *
   * Dönen `needsVerification` true ise çağıran (AuthModal) modalı kapatmak
   * yerine doğrulama panelini göstermelidir.
   */
  linkWithEmail: (
    email: string,
    password: string,
    mode: 'register' | 'signin',
  ) => Promise<{ needsVerification: boolean }>;
  /**
   * Hesap kaydını yeniden okur, doğrulanmışsa claim'leri tazeler ve sonucu döner.
   * Kullanıcı e-postadaki linke tıkladıktan sonra elindeki ID token hâlâ
   * `email_verified: false` taşır — kuralların ve Worker'ın yeni durumu görmesi
   * için `getIdToken(true)` şart.
   */
  refreshVerification: () => Promise<boolean>;
  /** Doğrulama e-postasını mevcut oturumlu kullanıcıya yeniden gönderir. */
  resendVerification: () => Promise<void>;
  /** Signs out — user becomes null (unauthenticated). No anonymous re-sign-in. */
  signOut: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailVerified, setEmailVerified] = useState(false);
  const [role, setRole] = useState<UserRole>('user');
  const dispatch = useDispatch<AppDispatch>();

  // 0. On Capacitor: pick up any pending redirect result immediately.
  useEffect(() => {
    getRedirectResult(auth).catch(() => {
      // No redirect pending — ignore
    });
  }, []);

  // 1. Subscribe to auth state. If no session exists, sign in anonymously.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Clear user-specific Dexie data when a different user logs in
        try {
          const prevUid = localStorage.getItem('activeUserId');
          if (prevUid && prevUid !== firebaseUser.uid) {
            await clearPlayedLevelsForUserSwitch();
          }
          localStorage.setItem('activeUserId', firebaseUser.uid);
        } catch { /* ignore */ }

        setUser(firebaseUser);
        setEmailVerified(firebaseUser.isAnonymous ? false : firebaseUser.emailVerified);

        const authProvider = resolveAuthProvider(firebaseUser);
        dispatch(
          setAuthUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            isAnonymous: firebaseUser.isAnonymous,
            authProvider,
            emailVerified: firebaseUser.isAnonymous ? false : firebaseUser.emailVerified,
          }),
        );
      } else {
        // User is signed out — stay unauthenticated (null).
        // JIT anonymous sign-in happens in play/page.tsx and game/page.tsx
        // right before the first level is loaded.
        setUser(null);
        setEmailVerified(false);
        dispatch(resetUser());
        setLoading(false);
      }
    });

    return unsubscribe;
  }, [dispatch]);

  // 2. Whenever user (or verification state) changes: sync Firestore doc + read role.
  useEffect(() => {
    if (!user) return;

    async function syncUser() {
      if (!user) return;
      try {
        const accepted = localStorage.getItem('accepted_terms') === 'true';

        let snap;
        if (user.isAnonymous) {
          snap = await getUserDocSnapshot(user.uid);
        } else if (emailVerified) {
          snap = await createOrUpdateUserDoc(user, accepted);
          // Bayrak ancak yazma BAŞARILI olduktan sonra silinir. Doğrulama
          // akışı devreye girdiğinden beri onay ile doküman oluşturma arasına
          // dakikalar ve bir uygulama yeniden başlatması girebiliyor; erken
          // silmek onay kaydının izini kaybettirirdi.
          if (accepted) localStorage.removeItem('accepted_terms');
        } else {
          // Kayıtlı ama e-postası doğrulanmamış → anonim seviye. Doküman
          // YARATILMAZ: aksi halde onUserCreated sahte bir hesaba kıt bir
          // tag yakardı. Varsa (Worker'ın anonim bootstrap'i) sadece okunur.
          snap = await getUserDocSnapshot(user.uid);
        }

        if (snap && snap.exists()) {
          const data = snap.data() as UserDoc;
          // 'reviewer' (Play Store inceleme hesabı) yalnızca ARAYÜZDE admin gibi
          // görünür ki inceleyici tüm sayfaları görebilsin. Yetki kapıları
          // (Firestore kuralları + Worker adminAuth) dokümandaki ham rolü okur
          // ve 'reviewer'ı tanımaz: bu hesap backend'e hiçbir şey yazamaz/okuyamaz.
          const rawRole = (data.role as string | undefined) ?? 'user';
          const firestoreRole: UserRole = rawRole === 'reviewer' ? 'admin' : (rawRole as UserRole);
          setRole(firestoreRole);
          dispatch(
            setFirestoreData({
              role: firestoreRole,
              totalScore: data.totalScore ?? 0,
              completedCount: data.completedCount ?? 0,
              xp: data.xp ?? 0,
              tag: data.tag ?? null,
            }),
          );
        }
      } catch (err) {
        console.error('[Auth] Firestore user sync failed:', err);
      } finally {
        setLoading(false);
      }
    }

    syncUser();
  }, [user, emailVerified, dispatch]);

  // 2b. E-posta doğrulama durumunu tazeleme.
  // Kullanıcı linke tıkladığında üç ayrı önbellek bayatlar: `User` nesnesinin
  // `emailVerified` alanı (reload), Firestore + Worker'ın kullandığı ID token
  // (getIdToken(true)) ve React state'i (setEmailVerified).
  const refreshVerification = useCallback(async (): Promise<boolean> => {
    const u = auth.currentUser;
    if (!u || u.isAnonymous) return false;
    try {
      await u.reload();
      const verified = auth.currentUser?.emailVerified ?? false;
      if (verified) {
        // Kurallar ve Worker yeni claim'i ancak zorla yenilemeyle görür.
        await auth.currentUser!.getIdToken(true);
      }
      setEmailVerified((prev) => (prev === verified ? prev : verified));
      return verified;
    } catch {
      return emailVerified;
    }
  }, [emailVerified]);

  // 2c. Doğrulama bekleyen oturumlar için yoklama + uygulamaya dönüş dinleyicileri.
  // APK'da doğrulama linki sistem tarayıcısında açılır ve uygulama hiçbir
  // geri çağrı almaz; `appStateChange` (uygulamaya dönüş) tek sinyaldir.
  useEffect(() => {
    if (!user || user.isAnonymous || emailVerified) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let ticks = 0;

    const tick = async () => {
      if (cancelled) return;
      const ok = await refreshVerification();
      if (ok || cancelled) return;
      ticks += 1;
      // İlk dakika 5 sn, sonra 20 sn; ~10 dk ön plan süresinden sonra durur.
      // Bu sınır accounts:lookup çağrılarını sınırlamak için var.
      if (ticks < 40) timer = setTimeout(tick, ticks <= 12 ? 5000 : 20000);
    };
    timer = setTimeout(tick, 5000);

    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshVerification();
    };
    document.addEventListener('visibilitychange', onVisible);

    let capHandle: { remove: () => void } | null = null;
    if (isNativePlatform()) {
      import('@capacitor/app')
        .then(({ App }) =>
          App.addListener('appStateChange', ({ isActive }) => {
            if (isActive) refreshVerification();
          }),
        )
        .then((handle) => {
          if (cancelled) handle.remove();
          else capHandle = handle;
        })
        .catch(() => { /* eklenti yoksa yoklama yeterli */ });
    }

    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      capHandle?.remove();
    };
  }, [user, emailVerified, refreshVerification]);

  // 2d. Doğrulama e-postasını yeniden gönderir (oturumlu kullanıcı için).
  const resendVerification = useCallback(async () => {
    const u = auth.currentUser;
    if (!u || u.isAnonymous) throw new Error('NO_SESSION');
    auth.languageCode = settingsService.getLanguage();
    await sendEmailVerification(u, getActionCodeSettings());
    markVerificationSent(u.uid);
  }, []);

  // 3. Google sign-in / linking
  // - user === null  → unauthenticated guest  → signInWithPopup / signInWithCredential
  // - user.isAnonymous → anonymous session     → linkWithPopup (preserves UID & data)
  // Anonim hesabı Google hesabına bağlar (verileri korumak için) veya doğrudan Google ile giriş yapar.
  const linkWithGoogle = useCallback(async () => {
    let credential: ReturnType<typeof GoogleAuthProvider.credential> | null = null;

    try {
      if (isNativePlatform()) {
        // Native giriş penceresi ve eklenti detayları services/auth'ta kapsüllendi.
        const { signInWithGoogleNative } = await import('@/services/auth/nativeGoogleSignIn');
        const idToken = await signInWithGoogleNative();

        credential = GoogleAuthProvider.credential(idToken);

        // Native: link if anonymous, otherwise sign in directly
        if (user?.isAnonymous) {
          await linkWithCredential(user, credential);
        } else {
          await signInWithCredential(auth, credential);
        }
      } else {
        const provider = new GoogleAuthProvider();

        if (user?.isAnonymous) {
          // Anonymous session exists → link to preserve UID and game data
          await linkWithPopup(user, provider);
        } else {
          // No session (guest) → direct sign-in
          await signInWithPopup(auth, provider);
        }

        // Force immediate state update (onAuthStateChanged may delay for same-UID link)
        const current = auth.currentUser!;
        setUser(current);
        // Google hesapları ilk token'da zaten email_verified:true taşır.
        setEmailVerified(current.emailVerified);
        dispatch(
          setAuthUser({
            uid: current.uid,
            email: current.email,
            displayName: current.displayName,
            isAnonymous: false,
            authProvider: resolveAuthProvider(current),
            emailVerified: current.emailVerified,
          }),
        );
        return;
      }

      // Native path: update state after credential operation
      const current = auth.currentUser!;
      setUser(current);
      setEmailVerified(current.emailVerified);
      dispatch(
        setAuthUser({
          uid: current.uid,
          email: current.email,
          displayName: current.displayName,
          isAnonymous: false,
          authProvider: resolveAuthProvider(current),
          emailVerified: current.emailVerified,
        }),
      );
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (
        code === 'auth/credential-already-in-use' ||
        code === 'auth/email-already-in-use'
      ) {
        // Google account already registered — sign in to that account instead
        const finalCredential = credential || GoogleAuthProvider.credentialFromError(
          err as Parameters<typeof GoogleAuthProvider.credentialFromError>[0],
        );
        if (finalCredential) {
          await signInWithCredential(auth, finalCredential);
          // onAuthStateChanged fires here (UID changes)
        }
      } else {
        throw err;
      }
    }
  }, [user, dispatch]);

  // 4. Email/password kayıt / giriş — e-posta sahipliği kapısıyla.
  //
  // İki farklı sertlik uygulanır ve ayrım kasıtlıdır:
  //
  // - Anonimden yükseltme (linkWithCredential): oturum KORUNUR. Bu kullanıcı
  //   zaten anonim olarak oynuyordu ve UID'si (dolayısıyla tüm ilerlemesi)
  //   bu hesabın içinde. Oturumu kapatmak ilerlemeyi erişilemez kılar ve
  //   hiçbir güvenlik kazancı sağlamaz — aynı şeyi hiç kayıt olmadan da
  //   yapabiliyordu. Doğrulanana dek anonim seviye haklarıyla sınırlı kalır
  //   (Worker: requireVerifiedEmail, kurallar: isVerifiedAccount).
  //
  // - Oturumsuz kayıt/giriş: doğrulama e-postası gönderilir ve ANINDA signOut
  //   edilir. Kaybedilecek veri yok, doğrulanmadan oturum açılmaz.
  const linkWithEmail = useCallback(
    async (
      email: string,
      password: string,
      mode: 'register' | 'signin',
    ): Promise<{ needsVerification: boolean }> => {
      // E-posta şablonunun dili: cihaz yerel ayarı değil, kullanıcının
      // uygulamada SEÇTİĞİ dil. useDeviceLanguage() burada yanlış olurdu.
      auth.languageCode = settingsService.getLanguage();
      const actionCodeSettings = getActionCodeSettings();

      if (mode === 'register') {
        if (user?.isAnonymous) {
          const credential = EmailAuthProvider.credential(email, password);
          await linkWithCredential(user, credential);
          // Force immediate state update (onAuthStateChanged may delay for same-UID link)
          const current = auth.currentUser!;
          setUser(current);
          setEmailVerified(false);
          dispatch(
            setAuthUser({
              uid: current.uid,
              email: current.email,
              displayName: current.displayName,
              isAnonymous: false,
              authProvider: 'email',
              emailVerified: false,
            }),
          );
          await sendEmailVerification(current, actionCodeSettings);
          markVerificationSent(current.uid);
          return { needsVerification: true };
        }

        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(cred.user, actionCodeSettings);
        // Oturumsuz yollarda kota e-posta ile anahtarlanır: signOut'tan sonra
        // uid elimizde kalmaz ve AuthModal geri sayımı okuyamazdı.
        markVerificationSent(email.toLowerCase());
        await firebaseSignOut(auth);
        return { needsVerification: true };
      }

      const cred = await signInWithEmailAndPassword(auth, email, password);
      if (!cred.user.emailVerified) {
        // Eski, hiç doğrulanmamış hesaplar da buradan geçer — muafiyet yok.
        await sendEmailVerification(cred.user, actionCodeSettings).catch(() => {
          // Kota dolmuş olabilir; oturumu yine de kapatmak zorundayız.
        });
        markVerificationSent(email.toLowerCase());
        await firebaseSignOut(auth);
        return { needsVerification: true };
      }
      return { needsVerification: false };
    },
    [user, dispatch],
  );

  // 5. Sign out → user becomes null (unauthenticated), no anonymous re-sign-in
  // Kullanıcının oturumunu kapatır ve yerel oturum durumunu temizler.
  const signOut = useCallback(async () => {
    dispatch(resetUser());
    await firebaseSignOut(auth);
    // onAuthStateChanged fires with null → user stays null (guest/unauthenticated)
  }, [dispatch]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        // isAnonymous: only true for an active anonymous Firebase Auth session.
        // Defaults to false (not true) when user is null — unauthenticated ≠ anonymous.
        isAnonymous: user?.isAnonymous ?? false,
        // isUnauthenticated: true when there is no session at all (user === null).
        isUnauthenticated: user === null,
        emailVerified,
        role,
        isModerator: role === 'admin' || role === 'moderator',
        linkWithGoogle,
        linkWithEmail,
        refreshVerification,
        resendVerification,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuthContext(): AuthContextValue {
  // AuthContext verilerine ve durumlarına erişmek için kullanılan özel React hook'u.
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used inside <AuthProvider>');
  return ctx;
}
