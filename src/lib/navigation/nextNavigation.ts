/**
 * DOSYA AMACI: Navigasyon adaptörünün "gerçek URL" uygulaması — doğrudan
 * `next/navigation` ve `next/link`'e delege eder. Web, Android ve Electron
 * build'lerinde kullanılır (bkz. `index.ts`).
 */
'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import NextLink from 'next/link';
import type { AppRouter } from './types';

export function useAppRouter(): AppRouter {
  return useRouter();
}

export function useAppSearchParams(): URLSearchParams {
  return useSearchParams();
}

export function useAppPathname(): string {
  return usePathname();
}

export const AppLink = NextLink;
