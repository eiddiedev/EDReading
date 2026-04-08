/**
 * Supabase 客户端 (Supabase Client)
 * 作用：初始化浏览器的 Supabase 客户端实例。
 * 定义：使用 `@supabase/ssr` 创建的单例客户端。
 * 逻辑：
 * 1. 配置 Supabase URL 和 Anon Key。
 * 2. 设置 Cookie 选项，确保 Auth 状态持久化。
 * 3. 全局拦截 fetch 请求，设置超时时间为 15 秒。
 */
import { createBrowserClient } from '@supabase/ssr';
import { getBrowserCookieOptions } from './supabase-cookie-options';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  cookieOptions: getBrowserCookieOptions(),
  global: {
    // 增加全局请求超时设置 (默认较短，改为 15秒)
    fetch: (url, options) => {
      return fetch(url, { ...options, signal: AbortSignal.timeout(15000) });
    }
  }
});
