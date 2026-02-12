-- 创建 API 使用日志表，用于限流
create table if not exists api_usage_logs (
  id uuid default gen_random_uuid() primary key,
  ip text not null,
  endpoint text not null,
  user_id uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 添加索引以加速查询
create index if not exists idx_api_usage_ip_created_at on api_usage_logs(ip, created_at);
create index if not exists idx_api_usage_user_created_at on api_usage_logs(user_id, created_at);

-- 设置 RLS
alter table api_usage_logs enable row level security;

-- 允许 Service Role 所有操作 (默认)

-- 允许用户查看自己的日志 (可选)
-- 先删除旧策略以避免 "policy already exists" 错误
drop policy if exists "Users can view their own usage logs" on api_usage_logs;

create policy "Users can view their own usage logs"
  on api_usage_logs for select
  using (auth.uid() = user_id);
