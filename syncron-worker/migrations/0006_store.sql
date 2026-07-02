-- Migration: 0006_store.sql
-- Description: Add store_events and donor_profiles tables for Lemon Squeezy integration.
--              Includes checks for size limits, currencies, constraints, and audit trail indexing.

-- ─── 1. store_events ──────────────────────────────────────────────────────────
-- Stores every webhook event received from Lemon Squeezy.
-- Keep the raw payload for extreme data integrity and auditing.
CREATE TABLE IF NOT EXISTS store_events (
  id               TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  ls_event_id      TEXT UNIQUE NOT NULL CHECK (length(ls_event_id) BETWEEN 1 AND 128),
  event_name       TEXT NOT NULL CHECK (length(event_name) BETWEEN 1 AND 64),
  uid              TEXT CHECK (uid IS NULL OR length(uid) BETWEEN 1 AND 128),
  ls_order_id      TEXT CHECK (ls_order_id IS NULL OR length(ls_order_id) BETWEEN 1 AND 128),
  ls_customer_id   TEXT CHECK (ls_customer_id IS NULL OR length(ls_customer_id) BETWEEN 1 AND 128),
  ls_variant_id    TEXT CHECK (ls_variant_id IS NULL OR length(ls_variant_id) BETWEEN 1 AND 128),
  product_name     TEXT CHECK (product_name IS NULL OR length(product_name) BETWEEN 1 AND 255),
  amount_cents     INTEGER NOT NULL CHECK (amount_cents > 0),
  currency         TEXT NOT NULL DEFAULT 'USD' CHECK (length(currency) = 3),
  customer_email   TEXT CHECK (customer_email IS NULL OR length(customer_email) BETWEEN 3 AND 255),
  customer_name    TEXT CHECK (customer_name IS NULL OR length(customer_name) BETWEEN 1 AND 255),
  donor_alias      TEXT CHECK (donor_alias IS NULL OR length(donor_alias) BETWEEN 1 AND 100),
  raw_payload      TEXT NOT NULL,
  sig_valid        INTEGER NOT NULL DEFAULT 1 CHECK (sig_valid IN (0, 1)),
  error_info       TEXT,
  created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_store_uid ON store_events(uid, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_store_event ON store_events(event_name, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_store_ls_event ON store_events(ls_event_id);

-- ─── 2. donor_profiles ────────────────────────────────────────────────────────
-- Summarized statistics of public/non-anonymous donation profiles.
-- Anon users won't have a UID (uid is NULL) and is_anonymous = 1.
CREATE TABLE IF NOT EXISTS donor_profiles (
  id                   TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  uid                  TEXT UNIQUE CHECK (uid IS NULL OR length(uid) BETWEEN 1 AND 128),
  display_name         TEXT NOT NULL DEFAULT 'Anonim' CHECK (length(display_name) BETWEEN 1 AND 50),
  total_donated_cents  INTEGER NOT NULL DEFAULT 0 CHECK (total_donated_cents >= 0),
  badge_tier           TEXT CHECK (badge_tier IS NULL OR badge_tier IN ('bronze', 'silver', 'gold')),
  is_anonymous         INTEGER NOT NULL DEFAULT 0 CHECK (is_anonymous IN (0, 1)),
  created_at           TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at           TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_donor_total ON donor_profiles(total_donated_cents DESC);
CREATE INDEX IF NOT EXISTS idx_donor_uid ON donor_profiles(uid);
