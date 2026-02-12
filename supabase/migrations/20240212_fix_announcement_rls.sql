-- Drop existing policies to prevent conflicts
drop policy if exists "Enable read access for all users" on public.announcements;
drop policy if exists "Enable insert for admin only" on public.announcements;
drop policy if exists "Enable update for admin only" on public.announcements;
drop policy if exists "Enable delete for admin only" on public.announcements;

-- 1. Public Read Policy: Users can only see active announcements
create policy "Public read active"
  on public.announcements
  for select
  using (is_active = true);

-- 2. Admin Full Access Policy: Admin (2314869561@qq.com) can perform ALL operations
-- and see ALL rows (active or inactive)
create policy "Admin full access"
  on public.announcements
  for all
  using (auth.jwt() ->> 'email' = '2314869561@qq.com')
  with check (auth.jwt() ->> 'email' = '2314869561@qq.com');
