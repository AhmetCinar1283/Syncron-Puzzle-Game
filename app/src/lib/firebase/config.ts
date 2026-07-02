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

// Çevre değişkenlerinden okunan Firebase yapılandırma bilgileri
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID!,
};

// Tarayıcı ortamında zaten başlatılmış bir Firebase uygulaması varsa onu kullanır, yoksa yeni başlatır
const app =
  typeof window !== "undefined" && firebaseConfig.apiKey
    ? getApps().length > 0
      ? getApp()
      : initializeApp(firebaseConfig)
    : initializeApp(firebaseConfig);

// Firebase servislerini dışa aktarır
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, "europe-west3"); // Avrupa bölgesi Cloud Functions
export const functionsUSA = getFunctions(app); // Varsayılan bölge Cloud Functions

