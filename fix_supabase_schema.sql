-- Run this script in your Supabase SQL Editor to fix missing columns

-- 1. Fix Vocabulary Table (Ensure all columns exist)
ALTER TABLE public.vocabulary ADD COLUMN IF NOT EXISTS phonetic text;
ALTER TABLE public.vocabulary ADD COLUMN IF NOT EXISTS translation text;
ALTER TABLE public.vocabulary ADD COLUMN IF NOT EXISTS example text;
ALTER TABLE public.vocabulary ADD COLUMN IF NOT EXISTS review_count int default 0;
ALTER TABLE public.vocabulary ADD COLUMN IF NOT EXISTS correct_count int default 0;
ALTER TABLE public.vocabulary ADD COLUMN IF NOT EXISTS tags text[];

-- 2. Fix Articles Table (Ensure all columns exist)
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS difficulty text;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS word_count int;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS is_read boolean default false;

-- 3. Fix Portal Links Table (Ensure all columns exist)
ALTER TABLE public.portal_links ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.portal_links ADD COLUMN IF NOT EXISTS url text;
ALTER TABLE public.portal_links ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.portal_links ADD COLUMN IF NOT EXISTS icon text;
ALTER TABLE public.portal_links ADD COLUMN IF NOT EXISTS open_mode text default 'iframe';
ALTER TABLE public.portal_links ADD COLUMN IF NOT EXISTS created_at timestamp with time zone default now();

-- 4. Verify Row Level Security is Enabled (Security Check)
ALTER TABLE public.vocabulary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_links ENABLE ROW LEVEL SECURITY;
