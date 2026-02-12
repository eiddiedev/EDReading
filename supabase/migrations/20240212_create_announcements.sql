-- Create announcements table
create table public.announcements (
  id uuid not null default gen_random_uuid (),
  content text not null,
  type text not null default 'info'::text,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  constraint announcements_pkey primary key (id)
);

-- Enable RLS
alter table public.announcements enable row level security;

-- Create policies
create policy "Enable read access for all users" on public.announcements
  for select
  using (is_active = true);

create policy "Enable insert for admin only" on public.announcements
  for insert
  with check (auth.jwt() ->> 'email' = '2314869561@qq.com');

create policy "Enable update for admin only" on public.announcements
  for update
  using (auth.jwt() ->> 'email' = '2314869561@qq.com');

create policy "Enable delete for admin only" on public.announcements
  for delete
  using (auth.jwt() ->> 'email' = '2314869561@qq.com');
