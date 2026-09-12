/**
 * DOSYA AMACI: `memoryRouterStore`'un birim testleri — portal build'lerinde
 * URL hiç değişmeden çalışan bellek içi router'ın push/replace/back davranışı.
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { memoryRouterStore } from './memoryNavigation';

describe('memoryRouterStore', () => {
  beforeEach(() => {
    // Her testten önce köke dön (store modül seviyesinde tek örnek).
    while (memoryRouterStore.getLocation().pathname !== '/') {
      memoryRouterStore.back();
    }
    memoryRouterStore.replace('/');
  });

  it('push pathname ve search\'i günceller', () => {
    memoryRouterStore.push('/play?id=5&source=preset');
    expect(memoryRouterStore.getLocation()).toEqual({ pathname: '/play', search: '?id=5&source=preset' });
  });

  it('query olmadan push edilirse search boş kalır', () => {
    memoryRouterStore.push('/levels');
    expect(memoryRouterStore.getLocation()).toEqual({ pathname: '/levels', search: '' });
  });

  it('back önceki konuma döner', () => {
    memoryRouterStore.push('/levels');
    memoryRouterStore.push('/play?id=1');
    memoryRouterStore.back();
    expect(memoryRouterStore.getLocation().pathname).toBe('/levels');
  });

  it('yığın tek elemanlıyken back hiçbir şey yapmaz', () => {
    memoryRouterStore.back();
    memoryRouterStore.back();
    expect(memoryRouterStore.getLocation().pathname).toBe('/');
  });

  it('replace geçmişe yeni girdi eklemez', () => {
    memoryRouterStore.push('/levels');
    memoryRouterStore.replace('/play?id=1');
    memoryRouterStore.back();
    expect(memoryRouterStore.getLocation().pathname).toBe('/');
  });

  it('subscribe her push/replace/back\'te dinleyiciyi tetikler', () => {
    let calls = 0;
    const unsubscribe = memoryRouterStore.subscribe(() => { calls++; });
    memoryRouterStore.push('/levels');
    memoryRouterStore.replace('/controls');
    memoryRouterStore.back();
    unsubscribe();
    memoryRouterStore.push('/play');
    expect(calls).toBe(3);
  });
});
