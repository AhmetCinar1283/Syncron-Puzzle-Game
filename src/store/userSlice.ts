/**
 * DOSYA AMACI: Bu dosya, kullanıcının oturum, yetki, profil ve puan durumunu
 * yöneten Redux Slice ve reducer/aksiyon tanımlarını barındırır.
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from './index';

// Oturum sağlayıcı tipleri
export type AuthProvider = 'anonymous' | 'google' | 'email' | null;
// Kullanıcı rol tipleri
export type UserRole = 'user' | 'moderator' | 'admin';

// Redux Kullanıcı Durum Yapısı (State)
export interface UserState {
  uid: string | null;
  email: string | null;
  displayName: string | null;
  isAnonymous: boolean;
  authProvider: AuthProvider;
  /**
   * E-posta sahipliği kanıtlanmış mı. Anonim oturumlarda her zaman false.
   * Özellik hook'larının AuthContext'e dokunmadan uyarı gösterebilmesi için
   * burada da tutulur — ama yetkilendirme kararı DEĞİL, sadece UX sinyali:
   * gerçek kapı Worker ve Firestore kurallarındadır.
   */
  emailVerified: boolean;
  role: UserRole;
  totalScore: number;
  completedCount: number;
  xp: number; // Kullanıcının XP miktarı
  tag: string | null;
  firestoreLoaded: boolean; // Kullanıcı verisinin Firestore'dan yüklenme durumu
  loading: boolean; // Genel yüklenme durumu
}

// Başlangıç durumu
const initialState: UserState = {
  uid: null,
  email: null,
  displayName: null,
  isAnonymous: true,
  authProvider: null,
  emailVerified: false,
  role: 'user',
  totalScore: 0,
  completedCount: 0,
  xp: 0,
  tag: null,
  firestoreLoaded: false,
  loading: true,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    // Firebase Auth oturum açtığında durum güncellemesi yapar
    setAuthUser(
      state,
      action: PayloadAction<{
        uid: string;
        email: string | null;
        displayName: string | null;
        isAnonymous: boolean;
        authProvider: AuthProvider;
        emailVerified?: boolean;
      }>,
    ) {
      state.uid = action.payload.uid;
      state.email = action.payload.email;
      state.displayName = action.payload.displayName;
      state.isAnonymous = action.payload.isAnonymous;
      state.authProvider = action.payload.authProvider;
      state.emailVerified = action.payload.emailVerified ?? false;
      state.loading = false;
    },
    // Kullanıcının Firestore'daki ek bilgilerini (puan, rol, etiket, xp) yükler
    setFirestoreData(
      state,
      action: PayloadAction<{
        role: UserRole;
        totalScore: number;
        completedCount: number;
        xp: number;
        tag: string | null;
      }>,
    ) {
      state.role = action.payload.role;
      state.totalScore = action.payload.totalScore;
      state.completedCount = action.payload.completedCount;
      state.xp = action.payload.xp;
      state.tag = action.payload.tag;
      state.firestoreLoaded = true;
    },
    // Kullanıcıya XP ve Skor eklemesi yapar (seviye bitiminde anlık UI güncellemesi için)
    addXpAndScore(
      state,
      action: PayloadAction<{
        scoreDelta: number;
        xpDelta: number;
        completedCountDelta: number;
      }>,
    ) {
      state.totalScore += action.payload.scoreDelta;
      state.xp += action.payload.xpDelta;
      state.completedCount += action.payload.completedCountDelta;
    },
    // Oturum kapatıldığında kullanıcı durumunu sıfırlar
    resetUser() {
      return { ...initialState, loading: false };
    },
  },
});

// Selector ve Actions tanımları
export const selectUser = (state: RootState) => state.user;
export const { setAuthUser, setFirestoreData, addXpAndScore, resetUser } = userSlice.actions;
export default userSlice.reducer;

