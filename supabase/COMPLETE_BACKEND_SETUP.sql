-- ============================================================================
-- PERSONAL PERFORMANCE SYSTEM (PPS) - SELF-HEALING CLOUD BACKEND SETUP
-- ============================================================================
-- Safe & Self-Healing: Automatically handles new tables OR existing tables
-- with missing/legacy columns without data loss.
-- ============================================================================

-- 1. Ensure required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 2. REFLECTIONS TABLE (Creates table or adds missing columns if it exists)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reflection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  content TEXT NOT NULL DEFAULT '',
  mood TEXT NOT NULL DEFAULT 'great',
  habits_log JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure all expected columns exist if the table was created previously with an older schema
ALTER TABLE public.reflections ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.reflections ADD COLUMN IF NOT EXISTS reflection_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.reflections ADD COLUMN IF NOT EXISTS content TEXT DEFAULT '';
ALTER TABLE public.reflections ADD COLUMN IF NOT EXISTS mood TEXT DEFAULT 'great';
ALTER TABLE public.reflections ADD COLUMN IF NOT EXISTS habits_log JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.reflections ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.reflections ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Ensure reflection_date has values populated if it was just added
UPDATE public.reflections SET reflection_date = created_at::DATE WHERE reflection_date IS NULL;

-- Enable RLS
ALTER TABLE public.reflections ENABLE ROW LEVEL SECURITY;

-- Idempotent RLS Policy
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'reflections' AND policyname = 'Users manage own reflections'
  ) THEN
    CREATE POLICY "Users manage own reflections" ON public.reflections 
      FOR ALL 
      USING (auth.uid() = user_id) 
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Add Unique Constraint on (user_id, reflection_date) safely
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_user_reflection_date'
  ) THEN
    ALTER TABLE public.reflections ADD CONSTRAINT unique_user_reflection_date UNIQUE (user_id, reflection_date);
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL; -- Ignore if constraint or duplicates exist
END $$;

-- Realtime Publication for Reflections
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.reflections;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;


-- ============================================================================
-- 3. AI SUGGESTIONS TABLE (Creates table or adds missing columns)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ai_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'general',
  reason TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure all columns exist
ALTER TABLE public.ai_suggestions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.ai_suggestions ADD COLUMN IF NOT EXISTS habit_id UUID REFERENCES public.habits(id) ON DELETE CASCADE;
ALTER TABLE public.ai_suggestions ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'general';
ALTER TABLE public.ai_suggestions ADD COLUMN IF NOT EXISTS reason TEXT DEFAULT '';
ALTER TABLE public.ai_suggestions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.ai_suggestions ADD COLUMN IF NOT EXISTS suggested_time TEXT;
ALTER TABLE public.ai_suggestions ADD COLUMN IF NOT EXISTS alternative_habit_name TEXT;
ALTER TABLE public.ai_suggestions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.ai_suggestions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.ai_suggestions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ai_suggestions' AND policyname = 'Users manage own suggestions'
  ) THEN
    CREATE POLICY "Users manage own suggestions" ON public.ai_suggestions 
      FOR ALL 
      USING (auth.uid() = user_id) 
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;


-- ============================================================================
-- 4. AI CONVERSATIONS TABLE (Creates table or adds missing columns)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user',
  content TEXT NOT NULL DEFAULT '',
  action_habits JSONB DEFAULT '[]'::jsonb,
  intent TEXT,
  model TEXT DEFAULT 'local',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure all columns exist
ALTER TABLE public.ai_conversations ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.ai_conversations ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
ALTER TABLE public.ai_conversations ADD COLUMN IF NOT EXISTS content TEXT DEFAULT '';
ALTER TABLE public.ai_conversations ADD COLUMN IF NOT EXISTS action_habits JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.ai_conversations ADD COLUMN IF NOT EXISTS intent TEXT;
ALTER TABLE public.ai_conversations ADD COLUMN IF NOT EXISTS model TEXT DEFAULT 'local';
ALTER TABLE public.ai_conversations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ai_conversations' AND policyname = 'Users manage own ai conversations'
  ) THEN
    CREATE POLICY "Users manage own ai conversations" ON public.ai_conversations 
      FOR ALL 
      USING (auth.uid() = user_id) 
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;


-- ============================================================================
-- 5. USER SETTINGS TABLE (Themes, Cross-Device Focus Session, Reminders)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'dark',
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  notification_prefs JSONB NOT NULL DEFAULT '{}'::jsonb,
  ritual_last_done DATE,
  default_reminder_settings JSONB DEFAULT '{"repeat": "Daily", "channel": "in_app", "deliveryType": "notification"}'::jsonb,
  auto_streak_freeze BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure all columns exist
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'dark';
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS notification_prefs JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS ritual_last_done DATE;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS default_reminder_settings JSONB DEFAULT '{"repeat": "Daily", "channel": "in_app", "deliveryType": "notification"}'::jsonb;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS auto_streak_freeze BOOLEAN DEFAULT false;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_settings' AND policyname = 'Users manage own settings'
  ) THEN
    CREATE POLICY "Users manage own settings" ON public.user_settings
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.user_settings;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_settings_user ON public.user_settings(user_id);


-- ============================================================================
-- 5.1 REMINDERS & ALARM STUDIO TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id UUID REFERENCES public.habits(id) ON DELETE SET NULL,
  label TEXT NOT NULL,
  reminder_time TIME NOT NULL,
  repeat_pattern TEXT NOT NULL DEFAULT 'Daily',
  channel TEXT NOT NULL DEFAULT 'in_app',
  delivery_type TEXT NOT NULL DEFAULT 'alarm',
  enabled BOOLEAN NOT NULL DEFAULT true,
  snoozed_until TIMESTAMPTZ,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure all columns exist for legacy migrations
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS habit_id UUID REFERENCES public.habits(id) ON DELETE SET NULL;
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS label TEXT DEFAULT 'Habit Reminder';
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS reminder_time TIME DEFAULT '09:00:00';
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS repeat_pattern TEXT DEFAULT 'Daily';
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'in_app';
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS delivery_type TEXT DEFAULT 'alarm';
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT true;
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS snoozed_until TIMESTAMPTZ;
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS last_triggered_at TIMESTAMPTZ;
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'reminders' AND policyname = 'Users manage own reminders'
  ) THEN
    CREATE POLICY "Users manage own reminders" ON public.reminders
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.reminders;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_reminders_user ON public.reminders(user_id);


-- ============================================================================
-- 6. FOCUS ROOMS STAGE 1: Study Groups, Members, Channels & Realtime Chat

-- ============================================================================

-- 5.1 CREATE ALL TABLES FIRST (To satisfy cross-table RLS policy references)

CREATE TABLE IF NOT EXISTS public.study_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  invite_code TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  privacy TEXT DEFAULT 'public' CHECK (privacy IN ('public', 'private')),
  max_members INT DEFAULT 20,
  avatar_emoji TEXT DEFAULT '📚',
  study_topic TEXT DEFAULT 'General Study',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.study_groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  display_name TEXT DEFAULT 'Member',
  avatar TEXT DEFAULT '👤',
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'admin', 'teacher', 'mentor')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'left')),
  current_streak INT DEFAULT 0,
  is_studying BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_group_user UNIQUE(group_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.group_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.study_groups(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  type TEXT DEFAULT 'general' CHECK (type IN ('general', 'resources', 'custom', 'announcements')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.channel_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES public.group_channels(id) ON DELETE CASCADE NOT NULL,
  group_id UUID REFERENCES public.study_groups(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_name TEXT NOT NULL DEFAULT 'User',
  sender_avatar TEXT DEFAULT '👤',
  content TEXT NOT NULL,
  type TEXT DEFAULT 'text' CHECK (type IN ('text', 'link', 'system', 'file')),
  link_url TEXT,
  pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5.2 Ensure All Columns Exist (Self-Healing)

ALTER TABLE public.study_groups ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.study_groups ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE public.study_groups ADD COLUMN IF NOT EXISTS invite_code TEXT;
ALTER TABLE public.study_groups ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.study_groups ADD COLUMN IF NOT EXISTS privacy TEXT DEFAULT 'public';
ALTER TABLE public.study_groups ADD COLUMN IF NOT EXISTS max_members INT DEFAULT 20;
ALTER TABLE public.study_groups ADD COLUMN IF NOT EXISTS avatar_emoji TEXT DEFAULT '📚';
ALTER TABLE public.study_groups ADD COLUMN IF NOT EXISTS study_topic TEXT DEFAULT 'General Study';
ALTER TABLE public.study_groups ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.group_members ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.study_groups(id) ON DELETE CASCADE;
ALTER TABLE public.group_members ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.group_members ADD COLUMN IF NOT EXISTS display_name TEXT DEFAULT 'Member';
ALTER TABLE public.group_members ADD COLUMN IF NOT EXISTS avatar TEXT DEFAULT '👤';
ALTER TABLE public.group_members ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member';
ALTER TABLE public.group_members ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.group_members ADD COLUMN IF NOT EXISTS current_streak INT DEFAULT 0;
ALTER TABLE public.group_members ADD COLUMN IF NOT EXISTS is_studying BOOLEAN DEFAULT false;
ALTER TABLE public.group_members ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.group_channels ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.study_groups(id) ON DELETE CASCADE;
ALTER TABLE public.group_channels ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.group_channels ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE public.group_channels ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'general';
ALTER TABLE public.group_channels ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.group_channels ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.channel_messages ADD COLUMN IF NOT EXISTS channel_id UUID REFERENCES public.group_channels(id) ON DELETE CASCADE;
ALTER TABLE public.channel_messages ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.study_groups(id) ON DELETE CASCADE;
ALTER TABLE public.channel_messages ADD COLUMN IF NOT EXISTS sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.channel_messages ADD COLUMN IF NOT EXISTS sender_name TEXT DEFAULT 'User';
ALTER TABLE public.channel_messages ADD COLUMN IF NOT EXISTS sender_avatar TEXT DEFAULT '👤';
ALTER TABLE public.channel_messages ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE public.channel_messages ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'text';
ALTER TABLE public.channel_messages ADD COLUMN IF NOT EXISTS link_url TEXT;
ALTER TABLE public.channel_messages ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT false;
ALTER TABLE public.channel_messages ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- 5.3 SECURITY DEFINER Helper (Prevents RLS Infinite Recursion)

CREATE OR REPLACE FUNCTION public.is_group_member(_user_id UUID, _group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE user_id = _user_id AND group_id = _group_id AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_group_admin(_user_id UUID, _group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE user_id = _user_id AND group_id = _group_id AND role IN ('admin', 'teacher') AND status = 'active'
  );
$$;

-- 5.4 Enable Row Level Security (RLS)

ALTER TABLE public.study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_messages ENABLE ROW LEVEL SECURITY;

-- Drop old policies to cleanly upgrade
DROP POLICY IF EXISTS "Public and member read study groups" ON public.study_groups;
DROP POLICY IF EXISTS "Authenticated create study groups" ON public.study_groups;
DROP POLICY IF EXISTS "Admins update study groups" ON public.study_groups;
DROP POLICY IF EXISTS "Members view group members" ON public.group_members;
DROP POLICY IF EXISTS "Authenticated join groups" ON public.group_members;
DROP POLICY IF EXISTS "Update own membership or admin update" ON public.group_members;
DROP POLICY IF EXISTS "Members view channels" ON public.group_channels;
DROP POLICY IF EXISTS "Members create channels" ON public.group_channels;
DROP POLICY IF EXISTS "Members view messages" ON public.channel_messages;
DROP POLICY IF EXISTS "Members insert messages" ON public.channel_messages;
DROP POLICY IF EXISTS "Senders or admins update messages" ON public.channel_messages;

-- 5.5 Create Non-Recursive RLS Policies

-- Study Groups Policies
CREATE POLICY "Public and member read study groups" ON public.study_groups
  FOR SELECT
  USING (
    privacy = 'public' OR
    created_by = auth.uid() OR
    public.is_group_member(auth.uid(), id)
  );

CREATE POLICY "Authenticated create study groups" ON public.study_groups
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admins update study groups" ON public.study_groups
  FOR UPDATE
  USING (
    created_by = auth.uid() OR
    public.is_group_admin(auth.uid(), id)
  );

-- Group Members Policies
CREATE POLICY "Members view group members" ON public.group_members
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    public.is_group_member(auth.uid(), group_id) OR
    group_id IN (SELECT id FROM public.study_groups WHERE privacy = 'public')
  );

CREATE POLICY "Authenticated join groups" ON public.group_members
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Update own membership or admin update" ON public.group_members
  FOR UPDATE
  USING (
    user_id = auth.uid() OR
    public.is_group_admin(auth.uid(), group_id)
  );

-- Group Channels Policies
CREATE POLICY "Members view channels" ON public.group_channels
  FOR SELECT
  USING (
    public.is_group_member(auth.uid(), group_id) OR
    group_id IN (SELECT id FROM public.study_groups WHERE privacy = 'public' OR created_by = auth.uid())
  );

CREATE POLICY "Members create channels" ON public.group_channels
  FOR INSERT
  WITH CHECK (
    group_id IN (SELECT id FROM public.study_groups WHERE created_by = auth.uid()) OR
    public.is_group_admin(auth.uid(), group_id)
  );

-- Channel Messages Policies
CREATE POLICY "Members view messages" ON public.channel_messages
  FOR SELECT
  USING (
    public.is_group_member(auth.uid(), group_id) OR
    group_id IN (SELECT id FROM public.study_groups WHERE privacy = 'public' OR created_by = auth.uid())
  );

CREATE POLICY "Members insert messages" ON public.channel_messages
  FOR INSERT
  WITH CHECK (
    public.is_group_member(auth.uid(), group_id) OR
    group_id IN (SELECT id FROM public.study_groups WHERE privacy = 'public' OR created_by = auth.uid())
  );

CREATE POLICY "Senders or admins update messages" ON public.channel_messages
  FOR UPDATE
  USING (
    sender_id = auth.uid() OR
    public.is_group_admin(auth.uid(), group_id)
  );

-- 5.5 Realtime Publications
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.study_groups;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.group_members;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.group_channels;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_messages;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================================
-- 7. FOCUS ROOMS STAGE 2: Synced Group Focus Sessions & Presence
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.group_focus_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.study_groups(id) ON DELETE CASCADE NOT NULL,
  is_running BOOLEAN NOT NULL DEFAULT false,
  started_at TIMESTAMPTZ,
  target_end_at TIMESTAMPTZ,
  total_sec INT NOT NULL DEFAULT 1500,
  paused_remaining_sec INT,
  mode TEXT NOT NULL DEFAULT 'work' CHECK (mode IN ('work', 'break')),
  task_name TEXT DEFAULT 'Group Focus Sprint',
  started_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  started_by_name TEXT DEFAULT 'Squad Member',
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_group_focus_session UNIQUE(group_id)
);

ALTER TABLE public.group_focus_sessions ADD COLUMN IF NOT EXISTS is_running BOOLEAN DEFAULT false;
ALTER TABLE public.group_focus_sessions ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE public.group_focus_sessions ADD COLUMN IF NOT EXISTS target_end_at TIMESTAMPTZ;
ALTER TABLE public.group_focus_sessions ADD COLUMN IF NOT EXISTS total_sec INT DEFAULT 1500;
ALTER TABLE public.group_focus_sessions ADD COLUMN IF NOT EXISTS paused_remaining_sec INT;
ALTER TABLE public.group_focus_sessions ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'work';
ALTER TABLE public.group_focus_sessions ADD COLUMN IF NOT EXISTS task_name TEXT DEFAULT 'Group Focus Sprint';
ALTER TABLE public.group_focus_sessions ADD COLUMN IF NOT EXISTS started_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.group_focus_sessions ADD COLUMN IF NOT EXISTS started_by_name TEXT DEFAULT 'Squad Member';
ALTER TABLE public.group_focus_sessions ADD COLUMN IF NOT EXISTS last_updated TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.group_focus_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read group focus sessions" ON public.group_focus_sessions;
CREATE POLICY "Members read group focus sessions" ON public.group_focus_sessions
  FOR SELECT
  USING (
    public.is_group_member(auth.uid(), group_id) OR
    group_id IN (SELECT id FROM public.study_groups WHERE privacy = 'public' OR created_by = auth.uid())
  );

DROP POLICY IF EXISTS "Members insert group focus sessions" ON public.group_focus_sessions;
CREATE POLICY "Members insert group focus sessions" ON public.group_focus_sessions
  FOR INSERT
  WITH CHECK (
    public.is_group_member(auth.uid(), group_id) OR
    group_id IN (SELECT id FROM public.study_groups WHERE privacy = 'public' OR created_by = auth.uid())
  );

DROP POLICY IF EXISTS "Members update group focus sessions" ON public.group_focus_sessions;
CREATE POLICY "Members update group focus sessions" ON public.group_focus_sessions
  FOR UPDATE
  USING (
    public.is_group_member(auth.uid(), group_id) OR
    group_id IN (SELECT id FROM public.study_groups WHERE privacy = 'public' OR created_by = auth.uid())
  );

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.group_focus_sessions;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================================
-- 8. PERFORMANCE INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_reflections_user_date ON public.reflections(user_id, reflection_date DESC);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_created ON public.ai_conversations(user_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_user_status ON public.ai_suggestions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_study_groups_invite ON public.study_groups(invite_code);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_channels_group ON public.group_channels(group_id);
CREATE INDEX IF NOT EXISTS idx_channel_messages_channel ON public.channel_messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_messages_created ON public.channel_messages(created_at ASC);
CREATE INDEX IF NOT EXISTS idx_group_focus_sessions_group ON public.group_focus_sessions(group_id);

-- ============================================================================
-- 9. VAYU AUTONOMOUS REAL-TIME PLANNING & TRACKING
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.vayu_daily_plans (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_date DATE NOT NULL DEFAULT CURRENT_DATE,
  blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_target_minutes INTEGER NOT NULL DEFAULT 0,
  completed_minutes INTEGER NOT NULL DEFAULT 0,
  completion_rate INTEGER NOT NULL DEFAULT 0,
  strategy_summary TEXT DEFAULT '',
  last_recalibrated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_vayu_plan_date UNIQUE (user_id, plan_date)
);

ALTER TABLE public.vayu_daily_plans ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'vayu_daily_plans' AND policyname = 'Users manage own vayu plans'
  ) THEN
    CREATE POLICY "Users manage own vayu plans" ON public.vayu_daily_plans
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.vayu_daily_plans;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_vayu_plans_user_date ON public.vayu_daily_plans(user_id, plan_date DESC);

-- ============================================================================
-- 10. SPRINT 2: PERFORMANCE INDEXES & GDPR / DPDP COMPLIANCE MIGRATION
-- ============================================================================

-- Ensure columns and compatibility tables exist
ALTER TABLE IF EXISTS public.habits ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

CREATE TABLE IF NOT EXISTS public.habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  habit_id UUID REFERENCES public.habits(id) ON DELETE CASCADE,
  completed_date TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.squad_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID,
  channel_id UUID,
  user_id UUID,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance Compound Indexes
CREATE INDEX IF NOT EXISTS idx_habits_user_active ON public.habits(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_habits_user_archived ON public.habits(user_id, archived);
CREATE INDEX IF NOT EXISTS idx_habit_completions_user_date ON public.habit_completions(user_id, completed_date);
CREATE INDEX IF NOT EXISTS idx_habit_logs_user_date ON public.habit_logs(user_id, completed_date);
CREATE INDEX IF NOT EXISTS idx_vayu_daily_plans_user_date ON public.vayu_daily_plans(user_id, plan_date);
CREATE INDEX IF NOT EXISTS idx_squad_messages_room_created ON public.squad_messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_channel_messages_group_created ON public.channel_messages(group_id, created_at DESC);

-- Permanent Account Deletion RPC Function (GDPR & DPDP Compliance)
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  calling_user_id UUID;
BEGIN
  calling_user_id := auth.uid();
  
  IF calling_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

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

  DELETE FROM auth.users WHERE id = calling_user_id;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;




-- ============================================================================
-- 9. ONBOARDING WIZARD & AI TELEMETRY BACKEND
-- ============================================================================

-- Extend profiles with onboarding attributes and AI context telemetry
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS primary_track TEXT CHECK (primary_track IN ('placements', 'competitive_exams', 'core_coding', 'fitness')),
ADD COLUMN IF NOT EXISTS track_5_challenge_active BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS daily_focus_target_minutes INTEGER NOT NULL DEFAULT 120,
ADD COLUMN IF NOT EXISTS selected_bottleneck TEXT,
ADD COLUMN IF NOT EXISTS social_mode TEXT CHECK (social_mode IN ('solo', 'create_squad', 'join_squad')),
ADD COLUMN IF NOT EXISTS onboarding_metadata JSONB DEFAULT '{}'::jsonb;

-- Also ensure public.habits supports title, frequency, target_count, time_of_day, status
ALTER TABLE public.habits
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS frequency TEXT DEFAULT 'daily',
ADD COLUMN IF NOT EXISTS target_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS time_of_day TEXT DEFAULT 'anytime',
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Onboarding telemetry audit table for future AI personalization & model fine-tuning
CREATE TABLE IF NOT EXISTS public.onboarding_telemetry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    primary_track TEXT NOT NULL,
    track_5_active BOOLEAN NOT NULL,
    focus_target_minutes INTEGER NOT NULL,
    bottleneck TEXT,
    social_mode TEXT,
    raw_responses JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.onboarding_telemetry ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'onboarding_telemetry' 
        AND policyname = 'Users can insert their own onboarding telemetry'
    ) THEN
        CREATE POLICY "Users can insert their own onboarding telemetry"
        ON public.onboarding_telemetry FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'onboarding_telemetry' 
        AND policyname = 'Users can view their own onboarding telemetry'
    ) THEN
        CREATE POLICY "Users can view their own onboarding telemetry"
        ON public.onboarding_telemetry FOR SELECT
        TO authenticated
        USING (auth.uid() = user_id);
    END IF;
END $$;

-- Atomic RPC to execute complete onboarding transaction
CREATE OR REPLACE FUNCTION public.complete_onboarding(
    p_payload JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_primary_track TEXT := p_payload->>'selectedPrimaryTrack';
    v_track_5_active BOOLEAN := COALESCE((p_payload->>'enableTrack5Challenge')::BOOLEAN, FALSE);
    v_focus_hours INTEGER := COALESCE((p_payload->>'dailyFocusHours')::INTEGER, 2);
    v_bottleneck TEXT := p_payload->>'selectedBottleneckId';
    v_social_choice TEXT := COALESCE(p_payload->>'socialChoice', 'solo');
    v_habits JSONB := p_payload->'customHabits';
    v_habit JSONB;
    v_squad_code TEXT := NULL;
    v_squad_id UUID := NULL;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Validate primary track
    IF v_primary_track NOT IN ('placements', 'competitive_exams', 'core_coding', 'fitness') THEN
        RAISE EXCEPTION 'Invalid primary track: %', v_primary_track;
    END IF;

    -- A. Update user profile
    UPDATE public.profiles
    SET
        onboarding_completed = TRUE,
        primary_track = v_primary_track,
        track_5_challenge_active = v_track_5_active,
        daily_focus_target_minutes = (v_focus_hours * 60),
        selected_bottleneck = v_bottleneck,
        social_mode = v_social_choice,
        onboarding_metadata = p_payload,
        updated_at = NOW()
    WHERE user_id = v_user_id OR id = v_user_id;

    -- Also keep user_settings in sync if user_settings exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_settings') THEN
        UPDATE public.user_settings
        SET onboarding_completed = TRUE, updated_at = NOW()
        WHERE user_id = v_user_id;
    END IF;

    -- B. Record AI training & coaching telemetry log
    INSERT INTO public.onboarding_telemetry (
        user_id,
        primary_track,
        track_5_active,
        focus_target_minutes,
        bottleneck,
        social_mode,
        raw_responses
    ) VALUES (
        v_user_id,
        v_primary_track,
        v_track_5_active,
        (v_focus_hours * 60),
        v_bottleneck,
        v_social_choice,
        p_payload
    );

    -- C. Seed starter habits
    IF v_habits IS NOT NULL AND jsonb_typeof(v_habits) = 'array' THEN
        FOR v_habit IN SELECT * FROM jsonb_array_elements(v_habits)
        LOOP
            INSERT INTO public.habits (
                user_id,
                name,
                title,
                category,
                period,
                frequency,
                target_count,
                time_of_day,
                status,
                created_at,
                updated_at
            ) VALUES (
                v_user_id,
                COALESCE(v_habit->>'title', 'Habit'),
                v_habit->>'title',
                COALESCE(v_habit->>'category', 'deep_work'),
                'Daily',
                COALESCE(v_habit->>'frequency', 'daily'),
                COALESCE((v_habit->>'target_count')::INTEGER, 1),
                COALESCE(v_habit->>'time_of_day', 'anytime'),
                'active',
                NOW(),
                NOW()
            );
        END LOOP;
    END IF;

    -- D. Handle Social Squad Creation if requested
    IF v_social_choice = 'create_squad' THEN
        -- Generate random 6-character alphanumeric squad code
        v_squad_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
        
        -- Insert squad record if study_squads table exists
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'study_squads') THEN
            INSERT INTO public.study_squads (
                created_by,
                name,
                invite_code,
                created_at
            ) VALUES (
                v_user_id,
                v_primary_track || ' Alpha Squad',
                v_squad_code,
                NOW()
            ) RETURNING id INTO v_squad_id;
        ELSIF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'study_groups') THEN
            INSERT INTO public.study_groups (
                created_by,
                name,
                invite_code,
                created_at
            ) VALUES (
                v_user_id,
                v_primary_track || ' Alpha Squad',
                v_squad_code,
                NOW()
            ) RETURNING id INTO v_squad_id;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE,
        'user_id', v_user_id,
        'squad_code', v_squad_code
    );
END;
$$;
