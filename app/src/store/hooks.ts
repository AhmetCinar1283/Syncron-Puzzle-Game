/**
 * DOSYA AMACI: Bu dosya, Redux dispatch ve selector fonksiyonları için
 * TypeScript tipleriyle özelleştirilmiş React hook'larını barındırır.
 */

import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from '.';

// Tip tanımlı useDispatch sarmalayıcısı (Thunk/Action dispatch işlemleri için)
export const useAppDispatch = () => useDispatch<AppDispatch>();

// Tip tanımlı useSelector sarmalayıcısı (Store durumunu okumak için)
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

