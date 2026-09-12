/**
 * DOSYA AMACI: Navigasyon adaptörünün "bellek içi" uygulaması. Portal build'leri
 * (CrazyGames/GameDistribution) tek bir statik `index.html` ile dağıtılır ve
 * alt dizinden/iframe içinden sunulur — gerçek URL değişimi (Next router'ın RSC
 * payload fetch'i) orada çalışmaz. Bu modül URL'i hiç değiştirmeden, saf React
 * state ile "hangi ekran aktif" sorusunu cevaplar (bkz. 00-mimari-ilkeler.md §3).
 */
'use client';

import { useSyncExternalStore, useMemo, type AnchorHTMLAttributes, type ReactNode } from 'react';
import type { AppRouter } from './types';

interface MemoryLocation {
  pathname: string;
  search: string;
}

const INITIAL_LOCATION: MemoryLocation = { pathname: '/', search: '' };

function parseHref(href: string): MemoryLocation {
  const [pathname, search = ''] = href.split('?');
  return { pathname: pathname || '/', search: search ? `?${search}` : '' };
}

class MemoryRouterStore {
  private location: MemoryLocation = INITIAL_LOCATION;
  private stack: MemoryLocation[] = [INITIAL_LOCATION];
  private listeners = new Set<() => void>();

  push = (href: string): void => {
    this.location = parseHref(href);
    this.stack.push(this.location);
    this.emit();
  };

  replace = (href: string): void => {
    this.location = parseHref(href);
    this.stack[this.stack.length - 1] = this.location;
    this.emit();
  };

  back = (): void => {
    if (this.stack.length <= 1) return;
    this.stack.pop();
    this.location = this.stack[this.stack.length - 1];
    this.emit();
  };

  getLocation = (): MemoryLocation => this.location;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private emit(): void {
    this.listeners.forEach((listener) => listener());
  }
}

/** Modül seviyesinde tek örnek — tüm portal ekranları aynı store'u paylaşır. */
export const memoryRouterStore = new MemoryRouterStore();

const memoryRouter: AppRouter = {
  push: memoryRouterStore.push,
  replace: memoryRouterStore.replace,
  back: memoryRouterStore.back,
};

export function useAppRouter(): AppRouter {
  return memoryRouter;
}

export function useAppPathname(): string {
  return useSyncExternalStore(
    memoryRouterStore.subscribe,
    () => memoryRouterStore.getLocation().pathname,
    () => INITIAL_LOCATION.pathname,
  );
}

export function useAppSearchParams(): URLSearchParams {
  const search = useSyncExternalStore(
    memoryRouterStore.subscribe,
    () => memoryRouterStore.getLocation().search,
    () => INITIAL_LOCATION.search,
  );
  return useMemo(() => new URLSearchParams(search), [search]);
}

interface AppLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  href: string;
  children: ReactNode;
}

/**
 * `next/link` yerine geçer: tıklamada URL'i hiç değiştirmeden store'a `push`
 * eder. `href` özniteliği bilerek gerçek yolu TAŞIMAZ (`#`) — portal build'i
 * doğrulaması (bkz. `scripts/portal/portalLimits.mjs`) mutlak `href="/..."`
 * referanslarını hata sayar; bu link zaten hiçbir zaman gerçekten dereference
 * edilmez (tıklama her zaman `preventDefault`).
 */
export function AppLink({ href, children, onClick, ...rest }: AppLinkProps) {
  return (
    <a
      href="#"
      {...rest}
      onClick={(e) => {
        e.preventDefault();
        memoryRouterStore.push(href);
        onClick?.(e);
      }}
    >
      {children}
    </a>
  );
}
