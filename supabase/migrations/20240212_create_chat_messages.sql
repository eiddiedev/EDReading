-- Create chat_messages table
create table if not exists public.chat_messages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text check (role in ('user', 'assistant', 'system')) not null,
  content text not null,
  created_at timestamp with time zone default now() not null
);

-- Enable RLS
alter table public.chat_messages enable row level security;

-- Policies
create policy "Users can view their own messages"
  on public.chat_messages for select
  using (auth.uid() = user_id);

create policy "Users can insert their own messages"
  on public.chat_messages for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own messages"
  on public.chat_messages for delete
  using (auth.uid() = user_id);

-- Create index for faster querying by user and time
create index if not exists chat_messages_user_created_idx on public.chat_messages (user_id, created_at);
