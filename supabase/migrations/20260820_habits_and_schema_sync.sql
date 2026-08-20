-- =========================================================================
-- CONSOLIDATED HABITS & SCHEMA SYNC
-- Ensures all habit columns exist and reloads PostgREST schema cache
-- =========================================================================

-- 1. Ensure all habit columns exist with proper defaults
ALTER TABLE public.habits
  ADD COLUMN IF NOT EXISTS color TEXT DEFAULT 'indigo',
  ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS start_time TEXT,
  ADD COLUMN IF NOT EXISTS end_time TEXT,
  ADD COLUMN IF NOT EXISTS start_alarm BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS end_alarm BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS freeze_credits INTEGER DEFAULT 2,
  ADD COLUMN IF NOT EXISTS last_start_triggered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_end_triggered_at TIMESTAMPTZ;

-- 2. Ensure profiles has all role and tier columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan_tier TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'member',
  ADD COLUMN IF NOT EXISTS total_xp INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS longest_streak INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 3. Ensure subscriptions table has updated_at
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
