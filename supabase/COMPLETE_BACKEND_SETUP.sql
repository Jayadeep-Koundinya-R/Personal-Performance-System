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
-- 5. PERFORMANCE INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_reflections_user_date ON public.reflections(user_id, reflection_date DESC);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_created ON public.ai_conversations(user_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_user_status ON public.ai_suggestions(user_id, status);
