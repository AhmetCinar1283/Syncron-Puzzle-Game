-- Migration: 0007_coins.sql
-- Description: Add coin economy and starter badge support.

-- Add coins columns to donor_profiles (cumulative balance)
ALTER TABLE donor_profiles ADD COLUMN coins_balance INTEGER NOT NULL DEFAULT 0 CHECK (coins_balance >= 0);

-- Add coins_earned to store_events (per-transaction earned amount)
ALTER TABLE store_events ADD COLUMN coins_earned INTEGER NOT NULL DEFAULT 0 CHECK (coins_earned >= 0);
