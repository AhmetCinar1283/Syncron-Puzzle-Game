/**
 * DOSYA AMACI: `services/friends/lib` altındaki SAF karar ve dönüştürme
 * fonksiyonlarının testleri. `routes/friends.ts` refactor'ünde (890 satırlık route
 * → ince route + servis) taşınan mantık burada birim olarak kilitlenir; uç nokta
 * davranışının kendisi `test/friendsApi.spec.ts` içinde doğrulanmaya devam eder.
 */

import { describe, it, expect } from 'vitest';
import { getCanonicalKeys, isAcceptableUidParam } from '../src/services/friends/lib/canonicalPair';
import {
  MAX_FRIENDS,
  MAX_PENDING_OUTGOING_REQUESTS,
  rejectForOwnFriendLimit,
  rejectForPendingOutgoingLimit,
  rejectForTargetFriendLimit,
  rejectPendingDecision,
  rejectRequestForExisting,
} from '../src/services/friends/lib/friendPolicy';
import {
  compareByDisplayName,
  compareByRequestedAtDesc,
  parseShowcaseBadges,
  toBlockedEntry,
  toFriendEntry,
  toRequestEntry,
  toSearchEntry,
} from '../src/services/friends/lib/friendRows';

describe('canonicalPair', () => {
  it('iki uid her sırayla verilse de aynı satır anahtarını üretir', () => {
    expect(getCanonicalKeys('bbb', 'aaa')).toEqual({ user_a: 'aaa', user_b: 'bbb' });
    expect(getCanonicalKeys('aaa', 'bbb')).toEqual({ user_a: 'aaa', user_b: 'bbb' });
  });

  it('uid parametresi boş ya da 128 karakterden uzun olamaz', () => {
    expect(isAcceptableUidParam(undefined)).toBe(false);
    expect(isAcceptableUidParam('')).toBe(false);
    expect(isAcceptableUidParam('u'.repeat(128))).toBe(true);
    expect(isAcceptableUidParam('u'.repeat(129))).toBe(false);
  });
});

describe('friendPolicy — mevcut ilişkiye karşı istek', () => {
  it('ilişki yoksa engel yoktur', () => {
    expect(rejectRequestForExisting(null, 'me')).toBeNull();
  });

  it('zaten arkadaşsa reddeder', () => {
    expect(rejectRequestForExisting({ status: 'accepted', requested_by: 'other' }, 'me')).toEqual({
      error: 'Already friends',
      httpStatus: 400,
    });
  });

  it('engelli ilişkide nötr mesaj döner (engelin varlığı sızdırılmaz)', () => {
    expect(rejectRequestForExisting({ status: 'blocked', requested_by: 'other' }, 'me')).toEqual({
      error: 'Action not allowed',
      httpStatus: 400,
    });
  });

  it('kendi bekleyen isteğini tekrar gönderemez', () => {
    expect(rejectRequestForExisting({ status: 'pending', requested_by: 'me' }, 'me')).toEqual({
      error: 'Friend request already pending',
      httpStatus: 400,
    });
  });

  it('karşı taraftan bekleyen istek varsa kabul etmeye yönlendirir', () => {
    expect(rejectRequestForExisting({ status: 'pending', requested_by: 'other' }, 'me')).toEqual({
      error: 'You have a pending request from this user. Accept it instead.',
      httpStatus: 400,
    });
  });
});

describe('friendPolicy — sınırlar', () => {
  it('arkadaş sınırı yalnızca eşiğe ULAŞINCA reddeder', () => {
    expect(rejectForOwnFriendLimit(MAX_FRIENDS - 1)).toBeNull();
    expect(rejectForOwnFriendLimit(MAX_FRIENDS)).toEqual({
      error: 'You have reached the maximum limit of 100 friends',
      httpStatus: 400,
    });
  });

  it('sayı okunamadıysa (null) istek engellenmez', () => {
    expect(rejectForOwnFriendLimit(null)).toBeNull();
    expect(rejectForTargetFriendLimit(undefined)).toBeNull();
    expect(rejectForPendingOutgoingLimit(null)).toBeNull();
  });

  it('karşı tarafın sınırı ayrı mesaj verir', () => {
    expect(rejectForTargetFriendLimit(MAX_FRIENDS)).toEqual({
      error: 'The other user has reached their friend limit',
      httpStatus: 400,
    });
  });

  it('bekleyen giden istek sınırı', () => {
    expect(rejectForPendingOutgoingLimit(MAX_PENDING_OUTGOING_REQUESTS - 1)).toBeNull();
    expect(rejectForPendingOutgoingLimit(MAX_PENDING_OUTGOING_REQUESTS)).toEqual({
      error: 'You have reached the limit of 20 pending outgoing requests',
      httpStatus: 400,
    });
  });
});

describe('friendPolicy — kabul/ret kararı', () => {
  it('istek yoksa ya da bekleyen değilse 404', () => {
    expect(rejectPendingDecision(null, 'me', 'accept')).toEqual({
      error: 'Friend request not found',
      httpStatus: 404,
    });
    expect(rejectPendingDecision({ status: 'accepted', requested_by: 'other' }, 'me', 'reject')).toEqual({
      error: 'Friend request not found',
      httpStatus: 404,
    });
  });

  it('kendi isteğini kabul ya da reddedemez', () => {
    expect(rejectPendingDecision({ status: 'pending', requested_by: 'me' }, 'me', 'accept')).toEqual({
      error: 'Cannot accept your own request',
      httpStatus: 400,
    });
    expect(rejectPendingDecision({ status: 'pending', requested_by: 'me' }, 'me', 'reject')).toEqual({
      error: 'Cannot reject your own request',
      httpStatus: 400,
    });
  });

  it('karşı tarafın bekleyen isteği kabul edilebilir', () => {
    expect(rejectPendingDecision({ status: 'pending', requested_by: 'other' }, 'me', 'accept')).toBeNull();
  });
});

describe('friendRows — rozet çözme', () => {
  it('JSON metnini çözer', () => {
    expect(parseShowcaseBadges('["a","b"]')).toEqual(['a', 'b']);
  });

  it('dizi olduğu gibi geçer', () => {
    expect(parseShowcaseBadges(['a'])).toEqual(['a']);
  });

  it('bozuk JSON yanıtı düşürmez, boş listeye düşer', () => {
    expect(parseShowcaseBadges('{bozuk')).toEqual([]);
  });

  it('null/undefined/sayı boş listeye düşer', () => {
    expect(parseShowcaseBadges(null)).toEqual([]);
    expect(parseShowcaseBadges(undefined)).toEqual([]);
    expect(parseShowcaseBadges(42)).toEqual([]);
  });
});

describe('friendRows — satır dönüşümleri', () => {
  it('profili eksik arkadaş "Player" olarak görünür', () => {
    expect(toFriendEntry({ friendUid: 'u1', friendsSince: '2026-01-01' })).toEqual({
      uid: 'u1',
      displayName: 'Player',
      tag: undefined,
      showcaseBadges: [],
      friendsSince: '2026-01-01',
    });
  });

  it('istek satırı requesterUid ve requestedAt taşır', () => {
    expect(
      toRequestEntry({ requesterUid: 'u2', displayName: 'Ada', tag: 'ADA', showcaseBadges: '[]', requestedAt: 't' }),
    ).toEqual({ uid: 'u2', displayName: 'Ada', tag: 'ADA', showcaseBadges: [], requestedAt: 't' });
  });

  it('engellenen satırı yalnızca profil alanlarını taşır', () => {
    expect(toBlockedEntry({ blockedUid: 'u3', displayName: 'Bob', tag: null })).toEqual({
      uid: 'u3',
      displayName: 'Bob',
      tag: null,
      showcaseBadges: [],
    });
  });

  it('arama satırında ilişki yoksa durum "none" olur', () => {
    expect(toSearchEntry({ uid: 'u4', displayName: 'Cem' })).toEqual({
      uid: 'u4',
      displayName: 'Cem',
      tag: undefined,
      showcaseBadges: [],
      friendshipStatus: 'none',
      friendshipRequestedBy: null,
    });
  });
});

describe('friendRows — sıralama', () => {
  it('arkadaşlar büyük/küçük harf duyarsız ada göre sıralanır', () => {
    const rows = [{ displayName: 'zeynep' }, { displayName: 'Ali' }, { displayName: null }];
    expect([...rows].sort(compareByDisplayName).map((r) => r.displayName ?? 'Player')).toEqual([
      'Ali',
      'Player',
      'zeynep',
    ]);
  });

  it('istekler en yeniden eskiye sıralanır', () => {
    const rows = [
      { requesterUid: 'a', requestedAt: '2026-01-01T00:00:00Z' },
      { requesterUid: 'b', requestedAt: '2026-05-01T00:00:00Z' },
      { requesterUid: 'c', requestedAt: null },
    ];
    expect([...rows].sort(compareByRequestedAtDesc).map((r) => r.requesterUid)).toEqual(['b', 'a', 'c']);
  });
});
