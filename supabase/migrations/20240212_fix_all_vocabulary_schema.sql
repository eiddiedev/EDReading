
-- Ensure table exists
create table if not exists public.vocabulary (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  word text not null,
  phonetic text,
  definition text,
  translation text,
  example text,
  review_count integer default 0,
  correct_count integer default 0,
  created_at timestamp with time zone default now()
);

-- Ensure all columns exist (idempotent)
alter table public.vocabulary add column if not exists next_review_at timestamp with time zone default now();
alter table public.vocabulary add column if not exists last_reviewed_at timestamp with time zone;
alter table public.vocabulary add column if not exists review_stage integer default 0;
alter table public.vocabulary add column if not exists mastery_level integer default 0;
alter table public.vocabulary add column if not exists tags text[] default array[]::text[];

-- Enable RLS
alter table public.vocabulary enable row level security;

-- Drop existing policies to avoid conflicts or outdated logic
drop policy if exists "Users can view their own vocabulary" on public.vocabulary;
drop policy if exists "Users can insert their own vocabulary" on public.vocabulary;
drop policy if exists "Users can update their own vocabulary" on public.vocabulary;
drop policy if exists "Users can delete their own vocabulary" on public.vocabulary;

-- Create comprehensive policies
create policy "Users can view their own vocabulary"
on public.vocabulary for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own vocabulary"
on public.vocabulary for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own vocabulary"
on public.vocabulary for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own vocabulary"
on public.vocabulary for delete
to authenticated
using (auth.uid() = user_id);
