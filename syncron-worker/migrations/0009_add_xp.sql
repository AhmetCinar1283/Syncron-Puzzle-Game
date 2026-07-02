-- Migration: 0009_add_xp.sql
-- Description: Add XP column to user_profiles table for XP economy tracking.

-- Add xp column to user_profiles (defaults to 0, must be non-negative)
ALTER TABLE user_profiles ADD COLUMN xp INTEGER NOT NULL DEFAULT 0 CHECK (xp >= 0);
