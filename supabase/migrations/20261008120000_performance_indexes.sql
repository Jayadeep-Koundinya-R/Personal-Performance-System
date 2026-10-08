-- ============================================================================
-- SPRINT 2: PERFORMANCE INDEXES & GDPR / DPDP COMPLIANCE MIGRATION
-- ============================================================================

-- 1. Ensure columns and tables exist for indexes
ALTER TABLE IF EXISTS public.habits ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Self-healing habit_logs compatibility table if not already created
CREATE TABLE IF NOT EXISTS public.habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  habit_id UUID REFERENCES public.habits(id) ON DELETE CASCADE,
  completed_date TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Self-healing squad_messages compatibility table if not already created
CREATE TABLE IF NOT EXISTS public.squad_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID,
  channel_id UUID,
  user_id UUID,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Performance Compound Indexes (Sprint 2)
CREATE INDEX IF NOT EXISTS idx_habits_user_active ON public.habits(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_habits_user_archived ON public.habits(user_id, archived);
CREATE INDEX IF NOT EXISTS idx_habit_completions_user_date ON public.habit_completions(user_id, completed_date);
CREATE INDEX IF NOT EXISTS idx_habit_logs_user_date ON public.habit_logs(user_id, completed_date);
CREATE INDEX IF NOT EXISTS idx_vayu_daily_plans_user_date ON public.vayu_daily_plans(user_id, plan_date);
CREATE INDEX IF NOT EXISTS idx_squad_messages_room_created ON public.squad_messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_channel_messages_group_created ON public.channel_messages(group_id, created_at DESC);

-- 3. Permanent Account Deletion RPC Function (GDPR & DPDP Compliance)
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  calling_user_id UUID;
BEGIN
  -- Authenticate calling user authoritatively
  calling_user_id := auth.uid();
  
  IF calling_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 1. Cascade delete all personal data
  DELETE FROM public.habit_completions WHERE user_id = calling_user_id;
  DELETE FROM public.habit_logs WHERE user_id = calling_user_id;
  DELETE FROM public.habits WHERE user_id = calling_user_id;
  DELETE FROM public.vayu_daily_plans WHERE user_id = calling_user_id;
  DELETE FROM public.reflections WHERE user_id = calling_user_id;
  DELETE FROM public.reminders WHERE user_id = calling_user_id;
  DELETE FROM public.user_settings WHERE user_id = calling_user_id;
  DELETE FROM public.ai_conversations WHERE user_id = calling_user_id;
  DELETE FROM public.ai_suggestions WHERE user_id = calling_user_id;
  DELETE FROM public.achievements WHERE user_id = calling_user_id;
  DELETE FROM public.group_members WHERE user_id = calling_user_id;
  DELETE FROM public.subscriptions WHERE user_id = calling_user_id;
  DELETE FROM public.profiles WHERE user_id = calling_user_id;

  -- 2. Delete auth user record
  DELETE FROM auth.users WHERE id = calling_user_id;

  RETURN TRUE;
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;
