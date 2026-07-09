-- Alarm and AI Updates Migration

-- 1. Extend public.reminders table
ALTER TABLE public.reminders
  ADD COLUMN IF NOT EXISTS delivery_type TEXT NOT NULL DEFAULT 'notification',
  ADD COLUMN IF NOT EXISTS snoozed_until TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS last_triggered_at TIMESTAMP WITH TIME ZONE;

-- 2. Create public.ai_suggestions table
CREATE TABLE IF NOT EXISTS public.ai_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'smart_timing', 'struggling_habit'
  habit_id UUID REFERENCES public.habits(id) ON DELETE CASCADE,
  suggested_time TIME,
  alternative_habit_name TEXT,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'dismissed'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Enable RLS on ai_suggestions
ALTER TABLE public.ai_suggestions ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for ai_suggestions
CREATE POLICY "Users can view own suggestions"
  ON public.ai_suggestions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own suggestions"
  ON public.ai_suggestions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. Trigger for updated_at on ai_suggestions
CREATE TRIGGER update_ai_suggestions_updated_at
  BEFORE UPDATE ON public.ai_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
