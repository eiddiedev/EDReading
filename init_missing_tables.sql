-- Run this script in your Supabase SQL Editor to initialize ALL tables
-- It uses "IF NOT EXISTS" so it is safe to run even if some tables partially exist

-- 1. Create Vocabulary Table (if missing)
CREATE TABLE IF NOT EXISTS public.vocabulary (
  id text not null,
  user_id uuid references auth.users not null,
  word text not null,
  phonetic text,
  definition text,
  translation text,
  example text,
  review_count int default 0,
  correct_count int default 0,
  tags text[],
  created_at timestamp with time zone default now(),
  primary key (id, user_id)
);

-- 2. Create Articles Table (if missing)
CREATE TABLE IF NOT EXISTS public.articles (
  id text not null,
  user_id uuid references auth.users not null,
  title text,
  content text,
  topic text,
  created_at timestamp with time zone default now(),
  difficulty text,
  word_count int,
  is_read boolean default false,
  primary key (id, user_id)
);

-- 3. Create Profiles Table (if missing)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  updated_at timestamp with time zone
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS device_id text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS usage_date text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS generate_count int default 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS import_count int default 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS chat_count int default 0;

-- 4. Enable RLS (Safe to run multiple times)
ALTER TABLE public.vocabulary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 5. Create Policies (Drop first to avoid duplication errors)

-- Vocabulary Policies
DROP POLICY IF EXISTS "Users can view own vocabulary" ON public.vocabulary;
CREATE POLICY "Users can view own vocabulary" ON public.vocabulary FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own vocabulary" ON public.vocabulary;
CREATE POLICY "Users can insert own vocabulary" ON public.vocabulary FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own vocabulary" ON public.vocabulary;
CREATE POLICY "Users can update own vocabulary" ON public.vocabulary FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own vocabulary" ON public.vocabulary;
CREATE POLICY "Users can delete own vocabulary" ON public.vocabulary FOR DELETE USING (auth.uid() = user_id);

-- Articles Policies
DROP POLICY IF EXISTS "Users can view own articles" ON public.articles;
CREATE POLICY "Users can view own articles" ON public.articles FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own articles" ON public.articles;
CREATE POLICY "Users can insert own articles" ON public.articles FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own articles" ON public.articles;
CREATE POLICY "Users can update own articles" ON public.articles FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own articles" ON public.articles;
CREATE POLICY "Users can delete own articles" ON public.articles FOR DELETE USING (auth.uid() = user_id);

-- Profiles Policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
