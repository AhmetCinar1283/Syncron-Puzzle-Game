'use client';

import React from 'react';
import { ThemeBackground } from '@/features/home/components/background/ThemeBackground';
import { useMotionTier } from '@/features/home/lib/motionTier';

/**
 * DOSYA AMACI: Ana menüdeki GPU hızlandırmalı dinamik tema parçacık motorunu
 * Levels sayfasına taşıyarak bütünsel oyun atmosferini korur.
 *
 * Ekran genişliği artık motorun kendi içinde okunuyor (mobilde daha az
 * parçacık ve dpr=1); burada yalnızca cihazın hareket kademesi belirlenir.
 */
export function LevelsThemeBackground() {
  const motionTier = useMotionTier();
  return <ThemeBackground motionTier={motionTier} />;
}
