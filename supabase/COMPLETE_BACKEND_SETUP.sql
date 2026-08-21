-- ============================================================================
-- PERSONAL PERFORMANCE SYSTEM (PPS) - COMPLETE CLOUD BACKEND SETUP
-- ============================================================================
-- Run this in your Supabase Dashboard -> SQL Editor (New Query -> Run)
-- This script is completely IDEMPOTENT (safe to run multiple times without data loss).
-- ============================================================================

-- 1. Ensure required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Reflections Table
CREATE TABLE IF NOT EXISTS public.reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reflection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  content TEXT NOT NULL DEFAULT '',
  mood TEXT NOT NULL DEFAULT 'great',
  habits_log JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_reflection_date UNIQUE (user_id, reflection_date)
);

ALTER TABLE public.reflections ENABLE ROW LEVEL SECURITY;

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

-- 3. AI Suggestions Table
CREATE TABLE IF NOT EXISTS public.ai_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id UUID REFERENCES public.habits(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  suggested_time TEXT,
  alternative_habit_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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

-- 4. AI Conversations Table
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  action_habits JSONB DEFAULT '[]'::jsonb,
  intent TEXT,
  model TEXT DEFAULT 'local',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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

-- 5. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_reflections_user_date ON public.reflections(user_id, reflection_date DESC);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_created ON public.ai_conversations(user_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_user_status ON public.ai_suggestions(user_id, status);

