-- Add is_pro_user to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_pro_user boolean default false;

-- Add is_public to articles (if not exists)
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS is_public boolean default false;

-- Add is_local_only is NOT needed in DB, it's client-side only.
