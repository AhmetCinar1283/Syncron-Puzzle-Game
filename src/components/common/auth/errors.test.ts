import { describe, expect, it } from 'vitest';
import { toMessageKey } from './errors';

describe('auth errors mapping', () => {
  it('maps invalid email', () => {
    expect(toMessageKey({ code: 'auth/invalid-email' })).toBe('auth.err_invalid_email');
  });

  it('maps invalid credential to wrong password key', () => {
    expect(toMessageKey({ code: 'auth/invalid-credential' })).toBe('auth.err_wrong_password');
  });

  it('maps email already in use', () => {
    expect(toMessageKey({ code: 'auth/email-already-in-use' })).toBe('auth.err_email_in_use');
  });

  it('returns empty string for popup-closed-by-user so no error is shown', () => {
    expect(toMessageKey({ code: 'auth/popup-closed-by-user' })).toBe('');
  });

  it('returns generic error key for unknown error codes', () => {
    expect(toMessageKey({ code: 'auth/unknown-error-code' })).toBe('auth.err_generic');
    expect(toMessageKey(new Error('something bad'))).toBe('auth.err_generic');
  });
});
