-- PPS Product SaaS migration: profiles extension, new tables, RLS, triggers

-- Extend profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS plan_tier TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS identity_class TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS total_xp INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS longest_streak INTEGER NOT NULL DEFAULT 0;

-- Auto-generate username and referral code on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  suffix INT := 0;
BEGIN
  base_username := lower(regexp_replace(
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)),
    '[^a-zA-Z0-9_]', '', 'g'
  ));
  IF base_username = '' OR length(base_username) < 3 THEN
    base_username := 'user' || substr(replace(NEW.id::text, '-', ''), 1, 8);
  END IF;
  final_username := base_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    suffix := suffix + 1;
    final_username := base_username || suffix::text;
  END LOOP;

  INSERT INTO public.profiles (user_id, display_name, username, referral_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)),
    final_username,
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  );

  INSERT INTO public.user_settings (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  INSERT INTO public.user_stats (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  INSERT INTO public.subscriptions (user_id, plan, status) VALUES (NEW.id, 'free', 'active') ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- User settings
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'system',
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  notification_prefs JSONB NOT NULL DEFAULT '{"email": true, "push": false}'::jsonb,
  ritual_last_done DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own settings" ON public.user_settings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Reflections
CREATE TABLE IF NOT EXISTS public.reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reflection_date DATE NOT NULL,
  content TEXT NOT NULL,
  mood TEXT NOT NULL DEFAULT 'great',
  habits_log JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, reflection_date)
);

ALTER TABLE public.reflections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own reflections" ON public.reflections FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Reminders
CREATE TABLE IF NOT EXISTS public.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id UUID REFERENCES public.habits(id) ON DELETE SET NULL,
  label TEXT NOT NULL,
  reminder_time TIME NOT NULL,
  repeat_pattern TEXT NOT NULL DEFAULT 'Every Day',
  channel TEXT NOT NULL DEFAULT 'in_app',
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own reminders" ON public.reminders FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🔔',
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own notifications" ON public.notifications FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);

-- User stats (denormalized for leaderboard)
CREATE TABLE IF NOT EXISTS public.user_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view user stats" ON public.user_stats FOR SELECT USING (true);
CREATE POLICY "Users update own stats via triggers" ON public.user_stats FOR UPDATE USING (auth.uid() = user_id);

-- Accountability circles
CREATE TABLE IF NOT EXISTS public.accountability_circles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_code TEXT NOT NULL UNIQUE DEFAULT upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.accountability_circles ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.circle_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES public.accountability_circles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(circle_id, user_id)
);

ALTER TABLE public.circle_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view circles" ON public.accountability_circles FOR SELECT
  USING (owner_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.circle_members cm WHERE cm.circle_id = id AND cm.user_id = auth.uid()
  ));
CREATE POLICY "Users create circles" ON public.accountability_circles FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners update circles" ON public.accountability_circles FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Owners delete circles" ON public.accountability_circles FOR DELETE USING (auth.uid() = owner_id);

CREATE POLICY "Members view circle membership" ON public.circle_members FOR SELECT
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.accountability_circles c WHERE c.id = circle_id AND c.owner_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.circle_members cm2 WHERE cm2.circle_id = circle_id AND cm2.user_id = auth.uid()
  ));
CREATE POLICY "Users join circles" ON public.circle_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users leave circles" ON public.circle_members FOR DELETE USING (auth.uid() = user_id);

-- Referrals
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own referrals" ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);
CREATE POLICY "Users create referrals" ON public.referrals FOR INSERT WITH CHECK (auth.uid() = referrer_id);

-- Quests
CREATE TABLE IF NOT EXISTS public.quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  target INTEGER NOT NULL DEFAULT 1,
  quest_type TEXT NOT NULL DEFAULT 'weekly',
  xp_reward INTEGER NOT NULL DEFAULT 25,
  active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.user_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quest_id UUID NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
  progress INTEGER NOT NULL DEFAULT 0,
  week_start DATE NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, quest_id, week_start)
);

ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_quests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone views active quests" ON public.quests FOR SELECT USING (active = true);
CREATE POLICY "Users manage own quest progress" ON public.user_quests FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Seed default quests
INSERT INTO public.quests (quest_key, title, description, target, quest_type, xp_reward) VALUES
  ('morning_momentum', 'Morning Momentum', 'Complete 3 habits before noon', 3, 'weekly', 30),
  ('perfect_streak', 'Perfect Streak', '3-day perfect completion streak', 3, 'weekly', 50),
  ('xp_hunter', 'XP Hunter', 'Earn 100 XP this week', 100, 'weekly', 40)
ON CONFLICT (quest_key) DO NOTHING;

-- Friendship delete policy
CREATE POLICY "Users delete own friendships" ON public.friendships FOR DELETE
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Lookup user by username (for friend invites)
CREATE OR REPLACE FUNCTION public.lookup_user_by_username(p_username TEXT)
RETURNS TABLE(user_id UUID, display_name TEXT, username TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.display_name, p.username
  FROM public.profiles p
  WHERE lower(p.username) = lower(trim(p_username))
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_user_by_username(TEXT) TO authenticated;

-- Sync user stats from habits
CREATE OR REPLACE FUNCTION public.sync_user_stats(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_xp INTEGER;
  v_level INTEGER;
  v_streak INTEGER;
BEGIN
  SELECT COALESCE(SUM(
    (SELECT COUNT(*) FROM public.habit_completions hc WHERE hc.habit_id = h.id) * 10
  ), 0) INTO v_xp FROM public.habits h WHERE h.user_id = p_user_id;

  v_level := floor(v_xp / 100.0) + 1;

  SELECT COALESCE(MAX(streak), 0) INTO v_streak FROM public.habits WHERE user_id = p_user_id;

  INSERT INTO public.user_stats (user_id, total_xp, level, longest_streak, updated_at)
  VALUES (p_user_id, v_xp, v_level, v_streak, now())
  ON CONFLICT (user_id) DO UPDATE SET
    total_xp = EXCLUDED.total_xp,
    level = EXCLUDED.level,
    longest_streak = GREATEST(public.user_stats.longest_streak, EXCLUDED.longest_streak),
    updated_at = now();

  UPDATE public.profiles SET total_xp = v_xp, level = v_level, longest_streak = GREATEST(longest_streak, v_streak)
  WHERE user_id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_sync_user_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.sync_user_stats(COALESCE(NEW.user_id, OLD.user_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS sync_stats_on_completion ON public.habit_completions;
CREATE TRIGGER sync_stats_on_completion
  AFTER INSERT OR DELETE ON public.habit_completions
  FOR EACH ROW EXECUTE FUNCTION public.trigger_sync_user_stats();

DROP TRIGGER IF EXISTS sync_stats_on_habit ON public.habits;
CREATE TRIGGER sync_stats_on_habit
  AFTER INSERT OR UPDATE OR DELETE ON public.habits
  FOR EACH ROW EXECUTE FUNCTION public.trigger_sync_user_stats();

-- Updated_at triggers
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_reflections_updated_at BEFORE UPDATE ON public.reflections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_reminders_updated_at BEFORE UPDATE ON public.reminders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reflections;
