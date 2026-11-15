-- =========================================================================
-- v0.6 DATA TRUTH: HABITS SYNC & REALTIME REPLICA IDENTITY
-- Ensures habit focus & circadian columns, indexes, and full replica identity
-- =========================================================================

-- 1. Ensure focus and circadian window columns exist on habits
ALTER TABLE public.habits
  ADD COLUMN IF NOT EXISTS requires_focus_timer BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS focus_duration_minutes INTEGER DEFAULT 25,
  ADD COLUMN IF NOT EXISTS window_start TEXT,
  ADD COLUMN IF NOT EXISTS window_end TEXT;

-- 2. Configure REPLICA IDENTITY FULL so deletes & updates broadcast complete row context to Realtime subscribers
ALTER TABLE public.habits REPLICA IDENTITY FULL;
ALTER TABLE public.habit_completions REPLICA IDENTITY FULL;

-- 3. Add performance indexes for rapid multi-device sync
CREATE INDEX IF NOT EXISTS idx_habits_user_created ON public.habits (user_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_habit_completions_habit_date ON public.habit_completions (habit_id, completed_date ASC);
CREATE INDEX IF NOT EXISTS idx_habit_completions_user ON public.habit_completions (user_id);

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
