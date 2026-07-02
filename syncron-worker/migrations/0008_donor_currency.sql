-- Migration: 0008_donor_currency.sql
-- Description: Add currency and USD equivalent total to donor_profiles.

-- Add currency column (default to USD, 3-char code)
ALTER TABLE donor_profiles ADD COLUMN currency TEXT NOT NULL DEFAULT 'USD' CHECK (length(currency) = 3);

-- Add total_donated_usd_cents column (USD equivalent cents for accurate badge thresholds)
ALTER TABLE donor_profiles ADD COLUMN total_donated_usd_cents INTEGER NOT NULL DEFAULT 0 CHECK (total_donated_usd_cents >= 0);
