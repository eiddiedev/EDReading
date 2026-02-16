/**
 * Supabase 代理/中间件逻辑 (Proxy)
 * 作用：处理服务端认证 Token 的刷新和 Cookie 管理。
 * 定义：Next.js 中间件逻辑函数。
 * 逻辑：
 * 1. 创建 Supabase 服务端客户端。
 * 2. 拦截请求，检查 Auth Token 有效性。
 * 3. 如果 Token 过期，自动刷新并更新 Response 中的 Cookie。
 * 4. 确保服务端组件能获取到有效的用户会话。
 */
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export default async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // 这一步最关键：它会检查 Token，如果过期了会自动刷新并写入 Cookie
  await supabase.auth.getUser()

  return response
}

// 配置匹配路径：排除静态资源和图片，只拦截页面和 API
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
