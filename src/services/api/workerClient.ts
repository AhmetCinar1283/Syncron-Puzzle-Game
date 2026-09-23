/**
 * DOSYA AMACI: Bu dosya, Cloudflare Worker API'larına istek gönderirken
 * yetkilendirme belirteçlerini (ID Token) otomatik olarak yöneten istemci sarmalayıcısını barındırır.
 */

import { auth } from '@/services/firebase';

/**
 * Sunucu hız limiti (429). Ayrı bir tip olmasının sebebi: çağıran taraf bunu
 * "sunucu bozuk" hatasından ayırıp kullanıcıya "biraz yavaşla" diyebilsin.
 * Oyun akışı bu hatada ASLA kilitlenmez (bkz. 03 §3.4).
 */
export class WorkerRateLimitError extends Error {
  readonly retryAfterSeconds: number;
  constructor(retryAfterSeconds: number) {
    super('RATE_LIMIT_EXCEEDED');
    this.name = 'WorkerRateLimitError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/** Bir hatanın hız limiti kaynaklı olup olmadığını güvenle söyler. */
export function isRateLimitError(err: unknown): err is WorkerRateLimitError {
  return err instanceof WorkerRateLimitError;
}

/**
 * Sunucu, e-posta sahipliği kanıtlanmadığı için isteği reddetti (403).
 * Ayrı bir tip olmasının sebebi: çağıran taraf bunu "sunucu bozuk"tan ayırıp
 * kullanıcıyı doğrulama akışına (AuthModal) yönlendirebilsin.
 */
export class EmailNotVerifiedError extends Error {
  constructor() {
    super('EMAIL_NOT_VERIFIED');
    this.name = 'EmailNotVerifiedError';
  }
}

/** Bir hatanın e-posta doğrulaması eksikliğinden olup olmadığını güvenle söyler. */
export function isEmailNotVerifiedError(err: unknown): err is EmailNotVerifiedError {
  return err instanceof EmailNotVerifiedError;
}

/**
 * Giriş yapmış kullanıcının Firebase ID Token'ını getirir.
 * Belirtecin süresi dolmak üzereyse (son 5 dakika) yenilenmeye zorlanır.
 */
export async function getWorkerIdToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    const tokenResult = await user.getIdTokenResult();
    const expirationTime = new Date(tokenResult.expirationTime).getTime();
    const now = Date.now();

    // Belirtecin süresi 5 dakikadan az sürede dolacaksa yenilemeye zorla (force refresh)
    const forceRefresh = expirationTime - now < 5 * 60 * 1000;
    return await user.getIdToken(forceRefresh);
  } catch (err) {
    console.error('[workerClient] Error resolving Firebase ID Token:', err);
    // Hata durumunda alternatif yenileme denemesi
    return await user.getIdToken(true);
  }
}

/**
 * Cloudflare Worker API uç noktalarına genel istek gönderme yardımcısı.
 * Oturum açılmışsa Authorization başlığına otomatik olarak Bearer token yerleştirir.
 */
export async function workerFetch<T = any>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'DELETE' | 'PUT';
    body?: unknown;
    requireAuth?: boolean; // varsayılan: false (kimlik doğrulama zorunlu mu?)
    headers?: Record<string, string>;
  } = {}
): Promise<T> {
  const { method = 'GET', body, requireAuth = false, headers: customHeaders } = options;

  let token: string | null = null;
  if (auth.currentUser) {
    token = await getWorkerIdToken();
  }

  // İstek için kimlik doğrulaması zorunluysa ve token yoksa hata fırlatır
  if (requireAuth && !token) {
    throw new Error('Unauthorized: No active session.');
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_WORKER_URL ||
    process.env.NEXT_PUBLIC_WORKER_API_URL ||
    '';

  // Yolun '/' ile başladığından emin olunur
  const sanitizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${baseUrl}${sanitizedPath}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const fetchOptions: RequestInit = {
    method,
    headers,
  };

  if (body !== undefined) {
    fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  let response = await fetch(url, fetchOptions);

  // E-posta doğrulaması reddi + bayat token yarışı. getWorkerIdToken yalnızca
  // son 5 dakikada zorla yeniler, yani 10 saniye önce doğrulamış bir kullanıcının
  // elindeki token bir saate kadar eski olabilir ve hâlâ email_verified:false
  // taşıyabilir. Bir kez zorla yenileyip tekrar dene; yine 403 ise gerçekten
  // doğrulanmamış demektir.
  if (response.status === 403 && token && auth.currentUser) {
    const body403 = await response.clone().json().catch(() => null);
    if (body403?.error === 'EMAIL_NOT_VERIFIED') {
      const freshToken = await auth.currentUser.getIdToken(true).catch(() => null);
      if (freshToken && freshToken !== token) {
        response = await fetch(url, {
          ...fetchOptions,
          headers: { ...headers, Authorization: `Bearer ${freshToken}` },
        });
      }
      if (response.status === 403) {
        throw new EmailNotVerifiedError();
      }
    }
  }

  if (response.status === 429) {
    // Retry-After eksik/bozuk gelirse 60 sn varsayılır; kullanıcıya gösterilen
    // mesaj süreye bağlı değildir, süre yalnızca çağıranın bilgisidir.
    const retryAfter = Number(response.headers.get('Retry-After'));
    throw new WorkerRateLimitError(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 60);
  }

  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`;
    try {
      const errorJson = await response.json();
      if (errorJson && errorJson.error) {
        errorMessage = errorJson.error;
      }
    } catch {
      // Hata yoksayılır
    }
    throw new Error(errorMessage);
  }

  return (await response.json()) as T;
}

