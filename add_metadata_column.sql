-- 补充字段：用于存储 AI 分析的结构化数据 (词汇、句子、短语等)
-- 这样缓存的文章才能包含完整的学习内容
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- 创建索引以加速 JSONB 查询 (可选，如果将来需要基于 tag 或词汇搜索)
CREATE INDEX IF NOT EXISTS idx_articles_metadata ON public.articles USING gin (metadata);
