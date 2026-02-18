-- Migration to add target_level column to profiles table

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS target_level text DEFAULT 'ielts';

-- Optional: Add a comment
COMMENT ON COLUMN public.profiles.target_level IS 'User target exam level (zk, gk, cet4, cet6, ky, ielts, toefl)';
