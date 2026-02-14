import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  cookieOptions: {
    name: 'sb-edreading-auth-token',
    maxAge: 60 * 60 * 24 * 7, // 7天
    domain: '',
    path: '/',
    sameSite: 'lax', // 安卓 Chrome 对 strict 兼容性不好
    secure: process.env.NODE_ENV === 'production',
  },
  global: {
    // 增加全局请求超时设置 (默认较短，改为 15秒)
    fetch: (url, options) => {
      return fetch(url, { ...options, signal: AbortSignal.timeout(15000) });
    }
  }
});
