/**
 * DOSYA AMACI: Arkadaşlık servisinin uç noktalarla konuştuğu ortak sonuç tipi.
 * Servis HTTP bilmez ama "hangi mesaj, hangi durum kodu" bilgisini taşır; route
 * dosyası yalnızca bunu JSON'a çevirir. Böylece hata metinleri tek yerde kalır.
 */

import type { Rejection } from './lib/friendPolicy';

export type { Rejection } from './lib/friendPolicy';

/** Yalnızca başarı/başarısızlık dönen eylemler (istek, kabul, ret, silme, engelleme). */
export type ActionOutcome = { ok: true } | ({ ok: false } & Rejection);

/** Veri dönen sorgular (listeler, arama). */
export type QueryOutcome<T> = { ok: true; data: T } | ({ ok: false } & Rejection);

export const ACTION_OK: ActionOutcome = { ok: true };

export function fail(rejection: Rejection): { ok: false } & Rejection {
  return { ok: false, ...rejection };
}

/** Servisin ihtiyaç duyduğu ortam parçası — tam `Env` gerekmez. */
export interface FriendsEnv {
  AUDIT_DB: D1Database;
  GOOGLE_SERVICE_ACCOUNT: string;
  FIREBASE_PROJECT_ID: string;
}
