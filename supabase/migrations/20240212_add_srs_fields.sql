-- Add SRS tracking fields to vocabulary table
alter table public.vocabulary
add column if not exists next_review_at timestamp with time zone default now(),
add column if not exists last_reviewed_at timestamp with time zone,
add column if not exists review_stage integer default 0,
add column if not exists mastery_level integer default 0;

-- Create index for faster queries on review status
create index if not exists vocabulary_next_review_at_idx on public.vocabulary (next_review_at);
create index if not exists vocabulary_user_id_idx on public.vocabulary (user_id);
