/**
 * DOSYA AMACI: Bu dosya, uygulamanın Redux Store yapılandırmasını kurar
 * ve reducer'ları birleştirerek dışa aktarır.
 */

import { configureStore } from '@reduxjs/toolkit';
import userReducer from './userSlice';

// Redux Store yapılandırması
export const store = configureStore({
  reducer: {
    user: userReducer, // Kullanıcı durumunu yöneten reducer
  },
});

// RootState ve AppDispatch tiplerinin dışa aktarımı
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

