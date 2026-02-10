-- 1. Fix Articles Table (Ensure all columns exist)
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS title_zh text;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS original_title text;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS tags text[];

-- 2. Fix Portal Links Table (Ensure all columns exist)
ALTER TABLE public.portal_links ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.portal_links ADD COLUMN IF NOT EXISTS url text;
ALTER TABLE public.portal_links ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.portal_links ADD COLUMN IF NOT EXISTS icon text;
ALTER TABLE public.portal_links ADD COLUMN IF NOT EXISTS open_mode text default 'iframe';
ALTER TABLE public.portal_links ADD COLUMN IF NOT EXISTS created_at timestamp with time zone default now();

-- 3. Verify Row Level Security is Enabled (Security Check)
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_links ENABLE ROW LEVEL SECURITY;