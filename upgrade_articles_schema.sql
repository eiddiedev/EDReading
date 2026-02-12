-- 1. 增加关键字段：等级 (level) 和 公开标记 (is_public) 
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS level text DEFAULT 'IELTS'; -- 例如: CET4, CET6, IELTS, TOEFL 
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false; 

-- 2. 优化 RLS (行级安全策略) 以实现“一人生成，全员共享” 
-- 允许所有用户查看标记为 public 的文章，即使不是他们创建的 
CREATE POLICY "Users can view public articles" 
ON public.articles FOR SELECT 
USING (is_public = true); 

-- 3. 为了性能，给查询频次最高的字段加索引 
CREATE INDEX IF NOT EXISTS idx_articles_topic_level ON public.articles (topic, level); 
CREATE INDEX IF NOT EXISTS idx_articles_is_public ON public.articles (is_public);
