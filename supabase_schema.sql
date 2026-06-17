-- =============================================================================
--  Supabase Schema SQL Script for Personal Performance System (PPS)
--  Copy and paste this script directly into your Supabase SQL Editor.
-- =============================================================================

-- Enable UUID extension if not enabled
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────────────────────────────────────
--  1. PROFILES TABLE
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text not null,
  total_xp integer default 0 not null,
  level integer default 1 not null,
  streak integer default 0 not null,
  freeze_credits integer default 2 not null,
  total_credits_used integer default 0 not null,
  perfect_days text[] default array[]::text[] not null,
  login_streak integer default 1 not null,
  last_login_date date,
  xp_per_completion integer default 10 not null,
  max_freeze_credits integer default 2 not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Profiles
alter table public.profiles enable row level security;

-- Profiles Policies
create policy "Users can view their own profile" 
  on public.profiles for select 
  using (auth.uid() = id);

create policy "Users can update their own profile" 
  on public.profiles for update 
  using (auth.uid() = id);

-- ─────────────────────────────────────────────────────────────────────────────
--  2. HABITS TABLE
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.habits (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  category text default 'Uncategorized' not null,
  priority text default 'Optional' not null, -- 'High' | 'Medium' | 'Low' | 'Optional'
  period text default 'Daily' not null, -- 'Daily' | 'Weekly' | 'Monthly' | 'Today'
  due_date timestamp with time zone not null,
  completed_dates text[] default array[]::text[] not null,
  streak integer default 0 not null,
  last_completed_date date,
  freeze_credits integer default 2 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Habits
alter table public.habits enable row level security;

-- Habits Policies
create policy "Users can view their own habits" 
  on public.habits for select 
  using (auth.uid() = user_id);

create policy "Users can insert their own habits" 
  on public.habits for insert 
  with check (auth.uid() = user_id);

create policy "Users can update their own habits" 
  on public.habits for update 
  using (auth.uid() = user_id);

create policy "Users can delete their own habits" 
  on public.habits for delete 
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
--  3. REFLECTIONS TABLE
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.reflections (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users on delete cascade not null,
  date date not null,
  text text not null,
  mood text default 'great' not null, -- 'great' | 'okay' | 'low' | 'stress'
  habit_id bigint references public.habits on delete set null,
  habit_name text,
  habits_log jsonb default '[]'::jsonb not null, -- snapshot of completions: [{id, name, completed}]
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Reflections
alter table public.reflections enable row level security;

-- Reflections Policies
create policy "Users can view their own reflections" 
  on public.reflections for select 
  using (auth.uid() = user_id);

create policy "Users can insert their own reflections" 
  on public.reflections for insert 
  with check (auth.uid() = user_id);

create policy "Users can update their own reflections" 
  on public.reflections for update 
  using (auth.uid() = user_id);

create policy "Users can delete their own reflections" 
  on public.reflections for delete 
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
--  4. REMINDERS TABLE
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.reminders (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users on delete cascade not null,
  label text not null,
  time text not null, -- 'HH:MM'
  repeat text default 'Every Day' not null, -- 'Every Day' | 'Weekdays' | 'Weekends' | 'Custom'
  enabled boolean default true not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Reminders
alter table public.reminders enable row level security;

-- Reminders Policies
create policy "Users can view their own reminders" 
  on public.reminders for select 
  using (auth.uid() = user_id);

create policy "Users can insert their own reminders" 
  on public.reminders for insert 
  with check (auth.uid() = user_id);

create policy "Users can update their own reminders" 
  on public.reminders for update 
  using (auth.uid() = user_id);

create policy "Users can delete their own reminders" 
  on public.reminders for delete 
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
--  5. TASKS TABLE
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.tasks (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  due_date date not null,
  note text default '' not null,
  email_reminder boolean default true not null,
  done boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Tasks
alter table public.tasks enable row level security;

-- Tasks Policies
create policy "Users can view their own tasks" 
  on public.tasks for select 
  using (auth.uid() = user_id);

create policy "Users can insert their own tasks" 
  on public.tasks for insert 
  with check (auth.uid() = user_id);

create policy "Users can update their own tasks" 
  on public.tasks for update 
  using (auth.uid() = user_id);

create policy "Users can delete their own tasks" 
  on public.tasks for delete 
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
--  6. CALENDAR CONNECTIONS TABLE
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.calendar_connections (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users on delete cascade not null,
  provider text not null, -- 'Google Calendar' | 'Outlook Calendar'
  email text not null,
  status text default 'coming_soon' not null, -- 'coming_soon' | 'connected'
  requested_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Calendar Connections
alter table public.calendar_connections enable row level security;

-- Calendar Connections Policies
create policy "Users can view their own calendar connections" 
  on public.calendar_connections for select 
  using (auth.uid() = user_id);

create policy "Users can insert/update their own connections" 
  on public.calendar_connections for insert 
  with check (auth.uid() = user_id);

create policy "Users can delete their own connections" 
  on public.calendar_connections for delete 
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
--  7. PROFILE AUTOCREATION TRIGGER
-- ─────────────────────────────────────────────────────────────────────────────
-- This function automatically inserts a row in public.profiles when a new user signs up.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, total_xp, level, streak, freeze_credits, xp_per_completion, max_freeze_credits)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    0,
    1,
    0,
    2,
    10,
    2
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to execute on auth.users insert
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
