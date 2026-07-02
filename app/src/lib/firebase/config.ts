"use client";
/**
 * DOSYA AMACI: Bu dosya, Firebase Client SDK'sını başlatır ve
 * uygulama genelinde kullanılacak servis örneklerini (Auth, Firestore, Storage, Functions) dışa aktarır.
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

// Çevre değişkenlerinden okunan Firebase yapılandırma bilgileri (Build sırasında hata alınmaması için mock fallback değerler eklenmiştir)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "mock-api-key-value-to-pass-nextjs-build",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "mock-auth-domain.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "mock-project-id",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "mock-storage-bucket.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "123456789012",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:123456789012:web:1234567890abcdef123456",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-MOCKMEASURE",
};

// Zaten başlatılmış bir Firebase uygulaması varsa onu kullanır, yoksa yeni başlatır
const app =
  getApps().length > 0
    ? getApp()
    : initializeApp(firebaseConfig);

// Firebase servislerini dışa aktarır
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, "europe-west3"); // Avrupa bölgesi Cloud Functions
export const functionsUSA = getFunctions(app); // Varsayılan bölge Cloud Functions

