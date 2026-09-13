/**
 * DOSYA AMACI: "Bu kullanıcı reklamsız hakka sahip mi?" sorusunun SUNUCU tarafı
 * tek bağlantı noktası. Satın alma hakkı 07 numaralı görevde bağlanır; o güne
 * kadar hiç kimse reklamsız sayılmaz — istemcinin "reklamsızım" beyanı kabul
 * edilmez (istemci tarafı `entitlement.ts` de şu an her zaman "hayır" döner).
 */

import type { Env } from '../../types';

export async function hasAdFreeEntitlement(_env: Env, _uid: string): Promise<boolean> {
  return false;
}
