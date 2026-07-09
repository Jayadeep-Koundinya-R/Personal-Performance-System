-- 1. Add default_reminder_settings to user_settings table
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS default_reminder_settings JSONB NOT NULL DEFAULT '{"repeat": "Daily", "channel": "in_app", "delivery_type": "notification"}'::jsonb;

-- 2. Add start_time, end_time, and trigger flags to habits table
ALTER TABLE public.habits
ADD COLUMN IF NOT EXISTS start_time TIME,
ADD COLUMN IF NOT EXISTS end_time TIME,
ADD COLUMN IF NOT EXISTS last_start_triggered_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_end_triggered_at TIMESTAMP WITH TIME ZONE;
