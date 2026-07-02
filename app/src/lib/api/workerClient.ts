/**
 * DOSYA AMACI: Bu dosya, Cloudflare Worker API'larına istek gönderirken
 * yetkilendirme belirteçlerini (ID Token) otomatik olarak yöneten istemci sarmalayıcısını barındırır.
 */

import { auth } from '@/app/src/lib/firebase';

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

  const response = await fetch(url, fetchOptions);

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

