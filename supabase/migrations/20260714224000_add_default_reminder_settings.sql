-- Add default_reminder_settings and auto_streak_freeze to user_settings table
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS default_reminder_settings JSONB NOT NULL DEFAULT '{"repeat": "Daily", "channel": "in_app", "deliveryType": "notification"}'::jsonb,
ADD COLUMN IF NOT EXISTS auto_streak_freeze BOOLEAN NOT NULL DEFAULT false;

