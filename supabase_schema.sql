-- 1. 确保表存在
CREATE TABLE IF NOT EXISTS public.vocabulary (
  id text not null,
  user_id uuid references auth.users not null,
  word text not null,
  primary key (id, user_id)
);

-- 2. 暴力修复所有可能缺失的字段 (逐个检查并添加)
-- 基础字段
ALTER TABLE public.vocabulary ADD COLUMN IF NOT EXISTS phonetic text;
ALTER TABLE public.vocabulary ADD COLUMN IF NOT EXISTS definition text;
ALTER TABLE public.vocabulary ADD COLUMN IF NOT EXISTS translation text;
ALTER TABLE public.vocabulary ADD COLUMN IF NOT EXISTS example text;

-- 统计与元数据字段
ALTER TABLE public.vocabulary ADD COLUMN IF NOT EXISTS review_count int default 0;
ALTER TABLE public.vocabulary ADD COLUMN IF NOT EXISTS correct_count int default 0;
ALTER TABLE public.vocabulary ADD COLUMN IF NOT EXISTS tags text[];
ALTER TABLE public.vocabulary ADD COLUMN IF NOT EXISTS created_at timestamp with time zone default now();

-- 3. 确保文章表也完整 (预防性修复)
CREATE TABLE IF NOT EXISTS public.articles (
  id text not null,
  user_id uuid references auth.users not null,
  primary key (id, user_id)
);

ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS title text;
-- 新增：确保双语标题字段存在
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS title_zh text;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS original_title text;

ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS content text;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS topic text;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS difficulty text;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS word_count int;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS is_read boolean default false;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS tags text[];
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS created_at timestamp with time zone default now();

-- 4. 确保 profiles 字段完整
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS device_id text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS usage_date text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS generate_count int default 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS import_count int default 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS chat_count int default 0;

-- 7. 确保导航站链接表存在
CREATE TABLE IF NOT EXISTS public.portal_links (
  id text not null,
  user_id uuid references auth.users not null,
  primary key (id, user_id)
);

ALTER TABLE public.portal_links ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.portal_links ADD COLUMN IF NOT EXISTS url text;
ALTER TABLE public.portal_links ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.portal_links ADD COLUMN IF NOT EXISTS icon text;
ALTER TABLE public.portal_links ADD COLUMN IF NOT EXISTS open_mode text default 'iframe';
ALTER TABLE public.portal_links ADD COLUMN IF NOT EXISTS created_at timestamp with time zone default now();


-- 4. 刷新 Schema 缓存并重置权限
NOTIFY pgrst, 'reload config';

-- 5. 确保 RLS 开启
ALTER TABLE public.vocabulary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_links ENABLE ROW LEVEL SECURITY;

-- 6. 重建权限策略
DROP POLICY IF EXISTS "Users can view own vocabulary" ON public.vocabulary;
CREATE POLICY "Users can view own vocabulary" ON public.vocabulary FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own vocabulary" ON public.vocabulary;
CREATE POLICY "Users can insert own vocabulary" ON public.vocabulary FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own vocabulary" ON public.vocabulary;
CREATE POLICY "Users can update own vocabulary" ON public.vocabulary FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own vocabulary" ON public.vocabulary;
CREATE POLICY "Users can delete own vocabulary" ON public.vocabulary FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own articles" ON public.articles;
CREATE POLICY "Users can view own articles" ON public.articles FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own articles" ON public.articles;
CREATE POLICY "Users can insert own articles" ON public.articles FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own articles" ON public.articles;
CREATE POLICY "Users can update own articles" ON public.articles FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own articles" ON public.articles;
CREATE POLICY "Users can delete own articles" ON public.articles FOR DELETE USING (auth.uid() = user_id);

-- 8. 导航站 RLS 策略
DROP POLICY IF EXISTS "Users can view own portal_links" ON public.portal_links;
CREATE POLICY "Users can view own portal_links" ON public.portal_links FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own portal_links" ON public.portal_links;
CREATE POLICY "Users can insert own portal_links" ON public.portal_links FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own portal_links" ON public.portal_links;
CREATE POLICY "Users can update own portal_links" ON public.portal_links FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own portal_links" ON public.portal_links;
CREATE POLICY "Users can delete own portal_links" ON public.portal_links FOR DELETE USING (auth.uid() = user_id);
