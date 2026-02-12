-- Enable RLS (idempotent)
alter table public.vocabulary enable row level security;

-- Drop existing policies to ensure clean state
drop policy if exists "Users can view their own vocabulary" on public.vocabulary;
drop policy if exists "Users can insert their own vocabulary" on public.vocabulary;
drop policy if exists "Users can update their own vocabulary" on public.vocabulary;
drop policy if exists "Users can delete their own vocabulary" on public.vocabulary;
drop policy if exists "Enable all access for users based on user_id" on public.vocabulary;

-- Re-create granular policies
create policy "Users can view their own vocabulary"
on public.vocabulary for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own vocabulary"
on public.vocabulary for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own vocabulary"
on public.vocabulary for update
to authenticated
using (auth.uid() = user_id);

create policy "Users can delete their own vocabulary"
on public.vocabulary for delete
to authenticated
using (auth.uid() = user_id);
