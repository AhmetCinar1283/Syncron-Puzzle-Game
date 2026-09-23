// NOT: Firebase Console'da "Email enumeration protection" AÇIK. Bu yüzden
// `auth/user-not-found` ve `auth/wrong-password` artık gelmez — ikisi de
// `auth/invalid-credential`'a çöker ve bu bilinçli bir bilgi sızıntısı
// kapatmasıdır. Ölü eşlemeleri burada tutmuyoruz.
/** Firebase hata kodunu i18n anahtarına çevirir. Boş string = kullanıcıya gösterme. */
export function toMessageKey(err: unknown): string {
  const code = (err as { code?: string }).code ?? '';
  if (code === 'auth/invalid-email') return 'auth.err_invalid_email';
  if (code === 'auth/invalid-credential') return 'auth.err_wrong_password';
  if (code === 'auth/email-already-in-use') return 'auth.err_email_in_use';
  if (code === 'auth/weak-password') return 'auth.err_weak_password';
  if (code === 'auth/too-many-requests') return 'auth.err_too_many_requests';
  if (code === 'auth/popup-closed-by-user') return '';
  if (code === 'auth/provider-already-linked') return 'auth.err_already_linked';
  return 'auth.err_generic';
}
