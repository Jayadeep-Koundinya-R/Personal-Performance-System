-- Migration: AI Conversations Table for Chat Memory
-- Allows users to persist their chat history across sessions

CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  intent TEXT,
  action_habits JSONB,
  model TEXT DEFAULT 'local',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookup of user's most recent chat history
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_created ON public.ai_conversations(user_id, created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only read, insert, and delete their own messages
CREATE POLICY "Users can view own conversations"
  ON public.ai_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations"
  ON public.ai_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations"
  ON public.ai_conversations FOR DELETE
  USING (auth.uid() = user_id);
