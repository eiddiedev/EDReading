
-- Check table definition
select 
  column_name, 
  data_type, 
  is_nullable
from information_schema.columns 
where table_schema = 'public' 
and table_name = 'vocabulary';

-- Check RLS policies
select * from pg_policies where tablename = 'vocabulary';

-- Check if RLS is enabled
select relname, relrowsecurity 
from pg_class 
where relname = 'vocabulary';
