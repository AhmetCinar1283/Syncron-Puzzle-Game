'use client';
/**
 * DOSYA AMACI: Bu bileşen, Redux Store'unu React bileşen ağacına
 * enjekte eden sarmalayıcı (Provider) bileşenidir.
 */

import { Provider } from 'react-redux';
import { store } from '.';
import type { ReactNode } from 'react';

/**
 * StoreProvider - Uygulamayı Redux Provider ile sarmalayan bileşen.
 */
export default function StoreProvider({ children }: { children: ReactNode }) {
  return <Provider store={store}>{children}</Provider>;
}

