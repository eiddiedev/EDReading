-- 加速“今日复习”查询
CREATE INDEX IF NOT EXISTS idx_vocab_review ON vocabulary(user_id, next_review_at);

-- 加速“文章列表”加载
CREATE INDEX IF NOT EXISTS idx_articles_list ON articles(is_public, created_at DESC);

-- 加速“生词查重”
CREATE INDEX IF NOT EXISTS idx_vocab_word_user ON vocabulary(user_id, word);
