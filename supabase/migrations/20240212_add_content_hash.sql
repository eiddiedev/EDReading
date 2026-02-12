-- Add content_hash column to articles for deduplication
ALTER TABLE articles ADD COLUMN IF NOT EXISTS content_hash text;

-- Create index on content_hash for fast lookups
CREATE INDEX IF NOT EXISTS idx_articles_content_hash ON articles(content_hash);

-- Update existing rows (Optional, but good for consistency if we can)
-- We can't easily compute hash in SQL for existing rows without a function, 
-- but we can leave them null and only fill new ones.
-- Or we can create a trigger to auto-compute hash? 
-- For now, let's just add the column. The application will handle populating it.
