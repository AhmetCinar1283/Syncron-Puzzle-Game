# Auth & User System

## Overview

All users are **silently signed in anonymously** on first open. They can optionally upgrade to a real account (Google or email/password) which links to the same Firebase UID — preserving all game progress.

---

## Firebase Auth Flow

```
App opens
  └── onAuthStateChanged
        ├── user exists → setUser, createOrUpdateUserDoc, read Firestore role
        └── no user     → signInAnonymously() → onAuthStateChanged fires again
```

**Sign-out davranışı:** `signOut()` → Firebase oturumu kapanır → `onAuthStateChanged` null ile tetiklenir → yeni anonim oturum açılır. Orphaned anonim hesaplar Firebase tarafından 30 gün sonra otomatik temizlenir.

On Capacitor (Android/iOS), `getRedirectResult(auth)` is called on mount to capture any pending Google redirect result from a previous session.

---

## AuthContext (`src/contexts/AuthContext.tsx`)

### Exported Values

| Value | Type | Description |
|---|---|---|
| `user` | `User \| null` | Current Firebase user |
| `loading` | `boolean` | True until first auth state resolves |
| `isAnonymous` | `boolean` | True while on anonymous session |
| `role` | `'user' \| 'moderator' \| 'admin'` | Read from `users/{uid}.role` in Firestore |
| `isModerator` | `boolean` | `role === 'admin' \|\| role === 'moderator'` |
| `linkWithGoogle()` | `() => Promise<void>` | See below |
| `linkWithEmail(email, password, mode)` | `Promise<void>` | See below |
| `signOut()` | `() => Promise<void>` | Signs out, re-signs anonymously |

### `linkWithGoogle()`

- **Web / Electron:** `linkWithPopup(user, GoogleAuthProvider)`
- **Capacitor (Android):** native sign-in via `services/auth/nativeGoogleSignIn.ts`
  (`@capgo/capacitor-social-login`, Android Credential Manager) → returns a Google **ID token** →
  `GoogleAuthProvider.credential(idToken)` → `linkWithCredential` when anonymous, otherwise
  `signInWithCredential`. No page reload, no `getRedirectResult` round-trip.
  (Previously `@codetrix-studio/capacitor-google-auth`, dropped — abandoned and Capacitor 6 only;
  see `.plans/yayin-hazirlik/raporlar/13-google-auth-uyumluluk.md`.)
- **Error `auth/credential-already-in-use`:** Google account already registered to a different UID → automatically calls `signInWithCredential` to switch to that account

### `linkWithEmail(email, password, mode)`

| `mode` | Action | UID behaviour |
|---|---|---|
| `'register'` (anonymous session) | `EmailAuthProvider.credential(email, pass)` → `linkWithCredential(user, cred)` → `sendEmailVerification` | **UID preserved** — anonymous data kept. Session stays open but is limited to the anonymous privilege tier until verified |
| `'register'` (no session) | `createUserWithEmailAndPassword` → `sendEmailVerification` → **immediate `signOut`** | No session until the email is verified |
| `'signin'` | `signInWithEmailAndPassword(auth, email, pass)`; if `!emailVerified` → resend + **immediate `signOut`** | Switches to existing account (different UID possible). Unverified legacy accounts get no exemption |

Returns `{ needsVerification: boolean }`; when `true`, `AuthModal` stays open and shows the verification panel.

> **Why `linkWithCredential` and not `linkWithEmailAndPassword`?**
> Firebase v9 modular SDK does not export `linkWithEmailAndPassword` as a standalone function. The equivalent is: create a credential with `EmailAuthProvider.credential(email, password)`, then pass it to `linkWithCredential(user, credential)`.

---

## UI Components

### `UserBadge` (`src/components/common/UserBadge.tsx`)
Fixed `position: fixed` button at top-right of every page (mounted in `src/app/layout.tsx`).
- Anonymous → emerald `Giriş Yap` pill
- Signed in → sky neon circle with first initial of display name / email

### `AuthModal` (`src/components/common/AuthModal.tsx`)
Opened by `UserBadge`. Two views:
- **Anonymous:** Google button + email/password form with Giriş Yap / Kayıt Ol tabs
- **Signed in:** account info + **tag management section** + language selector + sign-out button

#### Tag Management (signed-in view)
On mount, fetches `users/{uid}` from Firestore to read `tag`, `tagChangeCount`, `tagChangedAt`.
- Shows current tag as `#TAGNAME` (neon green)
- Shows remaining changes (`5 - tagChangeCount`)
- Shows cooldown days if `tagChangedAt` is set and < 2 weeks ago
- Shows input form only when `changesLeft > 0 && daysRemaining === 0`
- Calls `requestNewTag` Cloud Function with `{ tag }` and parses error codes: `TAG_INVALID_CHARS`, `TAG_LENGTH:min:max`, `TAG_TAKEN`, `TAG_COOLDOWN:N`, `TAG_MAX_CHANGES`

---

## Firestore User Document

```
users/{uid}
  ├── uid: string
  ├── authProvider: 'anonymous' | 'google' | 'email'  ← updated on Google/email link
  ├── createdAt: Timestamp
  ├── totalScore: number
  ├── completedCount: number                            ← incremented on first level completion
  ├── role: 'user' | 'moderator' | 'admin'             ← set manually in Firebase Console
  ├── tag?: string                                      ← display tag — written by Cloud Functions only
  ├── tagChangeCount?: number                           ← manual change count (max 5, auto-assign doesn't count)
  ├── tagChangedAt?: Timestamp                          ← last manual change time (cooldown: 2 weeks)
  ├── email?: string
  └── displayName?: string
```

`role` is read from Firestore, **not** from Firebase custom claims. It cannot be changed by the client (Firestore rules enforce `role` immutability on update). To promote a user to admin: set `role: "admin"` directly in the Firebase Console.

---

## Firestore Security Rules (relevant excerpts)

```javascript
function isVerifiedAccount() {
  return isSignedIn()
    && request.auth.token.get('email_verified', false) == true
    && request.auth.token.get('email', '') != '';
}
function isAdmin() {
  return isSignedIn() &&
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
}

// User doc: role cannot be self-escalated
allow update: if isOwner(uid)
  && request.resource.data.role == resource.data.role;

// Campaign levels: public read, admin-only write
match /levels/{id}      { allow read: if true; allow write: if isAdmin(); }
match /levelParts/{id}  { allow read: if true; allow write: if isAdmin(); }

// Community requests: verified users create, admin manages
match /levelRequests/{id} {
  allow get:    if isOwner(resource.data.submittedBy) || isAdmin();
  allow list:   if isAdmin();
  allow create: if isVerifiedAccount() && request.resource.data.submittedBy == request.auth.uid
                && request.resource.data.status == 'pending';
  allow update: if isAdmin();
  allow delete: if isOwner(resource.data.submittedBy) && resource.data.status == 'pending';
}
```

---

## Email Verification (ownership proof)

Without this anyone could register with a made-up address and immediately hold a fully privileged account. **Governing principle: an unverified account has exactly the anonymous privilege set — nothing more, nothing less.** Anonymous play (play, save, daily, rewards) stays open; verification gates everything above it (tag, friends, tickets, level requests, showcase, admin).

| Layer | Enforcement |
|---|---|
| Client (`AuthContext`, `AuthModal`) | Sends `sendEmailVerification`, keeps `emailVerified` as its **own state slice** (`user.reload()` mutates the same `User` object, so deriving it would never re-render). Polls + `visibilitychange` + Capacitor `appStateChange` while pending; `refreshVerification()` forces `getIdToken(true)`. The Firestore user doc is **not created** until verified. UX only — not a security boundary |
| Worker | `verifyIdToken` → `emailVerified` (`email_verified === true && email present`). `requireVerifiedEmail` (403 `EMAIL_NOT_VERIFIED`) on `/friends/*`, `/users/search`, `/badges/showcase`, `/create-ticket`, `/game/feedback`. `adminAuth` enforces it unconditionally, before the role read, and emits `auth.forbidden`. Gameplay routes are intentionally ungated |
| Firestore rules | `isVerifiedAccount()` on `users` create, `levelRequests` create, `supportTickets` list, ticket-message create. `users` update may only touch `authProvider` / `email` / `acceptedTermsAt` when verified |
| Cloud Functions | `requestNewTag`, `onUserCreated`, `onUserUpgraded` read `emailVerified` from the **Auth record** (never a Firestore field the client could write) before assigning a tag. `cleanupOldAnonymousUsers` also reaps password accounts unverified for 14 days **that have no `users/{uid}` doc** |

> **Why not `firebase.sign_in_provider`?** That claim is bound to the sign-in event that minted the refresh token and stays `'anonymous'` after `linkWithCredential` until a full re-sign-in. It was the silent bug in the old `isNotAnonymous()` helper. `email` / `email_verified` are regenerated from the account record on every token refresh, so they are the correct signal.

> **Why does the tag leak through `update`, not `create`?** An anonymous-then-linked user already has a Worker-created `users/{uid}` doc, so `createOrUpdateUserDoc` takes the update branch and patches `authProvider`, which fires `onUserUpgraded`. `onUserUpgraded` therefore no longer requires `before.authProvider === 'anonymous'`; it self-heals by assigning the tag once the user verifies.

Setup that lives outside the repo (Firebase Console): email templates (tr/en), `NEXT_PUBLIC_SITE_URL`'s host in Authorized domains, and **Email enumeration protection ON** (`user-not-found` / `wrong-password` collapse into `auth/invalid-credential`; `AuthModal.toMessageKey` was updated accordingly). Continue URL is `${NEXT_PUBLIC_SITE_URL}/auth/verified` with `handleCodeInApp: false` (Dynamic Links were shut down in Aug 2025).

---

## Tag System (`functions/src/index.ts`)

Tags are short identifiers shown as `#TAGNAME`. Written exclusively by Cloud Functions — client cannot write `tags/` or `tag` field directly.

### Auto-assignment (Cloud Functions)
- `onUserCreated` — fires when `users/{uid}` doc is first created; skips anonymous users
- `onUserUpgraded` — fires when `authProvider` changes from `anonymous` → real; assigns tag if missing
- Both call `assignUniqueTag(uid)` which generates a random 6-char tag and retries up to 20× on collision

### Manual Change (`requestNewTag` callable)
Client calls: `httpsCallable(functions, 'requestNewTag')({ tag: 'MYTAG' })`

**Validation constants:**
- `VALID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'` (no I, O, 0, 1)
- Length: 3–10 characters
- Max 5 manual changes per account
- Cooldown: 2 weeks between changes (no cooldown on first manual change)

**Error messages returned in `HttpsError.message`:**
| Message | Meaning |
|---|---|
| `TAG_REQUIRED` | No tag provided |
| `TAG_LENGTH:3:10` | Wrong length |
| `TAG_INVALID_CHARS` | Invalid character |
| `TAG_MAX_CHANGES` | 5/5 used |
| `TAG_COOLDOWN:N` | N days remaining |
| `TAG_TAKEN` | Tag already owned by another user |

**Success:** updates `users/{uid}.tag`, `tagChangeCount` (increment), `tagChangedAt` (serverTimestamp). Releases old tag from `tags/` collection. If requested tag equals current tag → no-op, no count consumed.

**`tags/{tag}` collection:** `{ uid, assignedAt }` — uniqueness registry, written by Cloud Functions only (locked to client via Firestore rules).

---

## Language Detection (`src/contexts/LanguageContext.tsx`)

`getInitialLang()` priority:
1. `localStorage('lang')` — user's saved preference
2. `navigator.language` — browser language (first open only); `tr` if starts with `'tr'`, otherwise `en`

When user manually changes language via `LangSection`, it's saved to `localStorage('lang')`.

---

## Sync

On app open and on `visibilitychange` (tab focus), `useFirestoreSync` runs:
1. `syncAllParts()` — syncs Firestore `levels` / `levelParts` → Dexie `presetLevels`
2. `syncPlayedLevels(uid)` — syncs `users/{uid}/playedLevels` → Dexie `playedLevels`

Both use a **24-hour cooldown** stored in Dexie `syncMeta` table (key per collection).
Delta queries use `where('updatedAt', '>', lastSync)` — only changed records are fetched.

Pass `force = true` to bypass cooldown (used by the ↻ button in `/levels`).

## User Data Isolation

`onAuthStateChanged` compares the incoming UID against `localStorage('activeUserId')`. If they differ (different account logged in), `playedLevels` and `syncMeta` are cleared from Dexie before proceeding. `activeUserId` is then updated to the new UID.

All user-specific localStorage keys (`lastPlayedLevelId`, `lastPlayedSource`, `soundMuted`) are scoped with the UID prefix via `useUserStorage()` / `userStorageGet/Set/Remove()`. See `docs/database.md` for details.

See `docs/database.md` for Dexie schema details.
