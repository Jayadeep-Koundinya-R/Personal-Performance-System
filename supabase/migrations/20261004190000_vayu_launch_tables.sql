-- ============================================================================
-- 🌬️ VAYU LAUNCH MIGRATION: Autonomous Real-Time Planning & Tracking Tables
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

-- Enable Row Level Security (RLS) for complete data isolation
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

-- Enable Realtime publication
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.vayu_daily_plans;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
