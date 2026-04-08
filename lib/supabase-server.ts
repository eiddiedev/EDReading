import { createServerClient } from '@supabase/ssr'
import { headers, cookies } from 'next/headers'
import { getRequestProtocol, getSupabaseCookieOptions } from './supabase-cookie-options'

export async function createClient() {
  const cookieStore = await cookies()
  const headerStore = await headers()
  const cookieOptions = getSupabaseCookieOptions({
    protocol: getRequestProtocol(headerStore),
  })

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions,
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
          }
        },
      },
      global: {
        fetch: (url, options) => {
          return fetch(url, { ...options, signal: AbortSignal.timeout(20000) })
        }
      }
    }
  )
}
