-- Add start_alarm and end_alarm columns to public.habits
ALTER TABLE public.habits
  ADD COLUMN IF NOT EXISTS start_alarm BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS end_alarm BOOLEAN NOT NULL DEFAULT false;
