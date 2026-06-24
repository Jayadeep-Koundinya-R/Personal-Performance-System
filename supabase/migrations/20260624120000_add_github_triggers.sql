-- Add GitHub triggers support to habits

-- Add an array of keywords that trigger this habit via GitHub commits
ALTER TABLE public.habits 
ADD COLUMN IF NOT EXISTS github_trigger_keywords text[] DEFAULT '{}'::text[];

-- Add a column to track the last commit hash that triggered a completion 
-- to prevent duplicate rewards for the same commit
ALTER TABLE public.habits 
ADD COLUMN IF NOT EXISTS last_github_commit_hash text;

-- Add a comment explaining the purpose
COMMENT ON COLUMN public.habits.github_trigger_keywords IS 'Array of keywords. If a GitHub commit message matches any keyword (via AI or regex), this habit is checked off automatically.';
