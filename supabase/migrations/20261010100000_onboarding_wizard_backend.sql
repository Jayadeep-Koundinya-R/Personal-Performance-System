-- ==============================================================================
-- Migration: 20261010100000_onboarding_wizard_backend.sql
-- Description: Onboarding schema extension, AI telemetry table, and complete_onboarding RPC
-- ==============================================================================

-- 1. Extend profiles with onboarding attributes and AI context telemetry
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS primary_track TEXT CHECK (primary_track IN ('placements', 'competitive_exams', 'core_coding', 'fitness')),
ADD COLUMN IF NOT EXISTS track_5_challenge_active BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS daily_focus_target_minutes INTEGER NOT NULL DEFAULT 120,
ADD COLUMN IF NOT EXISTS selected_bottleneck TEXT,
ADD COLUMN IF NOT EXISTS social_mode TEXT CHECK (social_mode IN ('solo', 'create_squad', 'join_squad')),
ADD COLUMN IF NOT EXISTS onboarding_metadata JSONB DEFAULT '{}'::jsonb;

-- Also ensure public.habits supports both column schemas (name/title, frequency/period, target_count, time_of_day, status)
ALTER TABLE public.habits
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS frequency TEXT DEFAULT 'daily',
ADD COLUMN IF NOT EXISTS target_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS time_of_day TEXT DEFAULT 'anytime',
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- 2. Onboarding telemetry audit table for future AI personalization & model fine-tuning
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

-- 3. Atomic RPC to execute complete onboarding transaction
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
