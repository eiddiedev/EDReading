/**
 * 速率限制工具 (Rate Limiter)
 * 作用：防止 API 被滥用，控制用户和 IP 的请求频率。
 * 定义：基于内存缓存和数据库记录的混合限流策略。
 * 逻辑：
 * 1. 白名单检查：管理员账号免限流。
 * 2. 短期限流：内存 Map 记录 IP，限制 1 分钟内的频繁请求。
 * 3. 长期限流：查询 Supabase `api_usage_logs` 表，限制每日请求次数。
 * 4. 记录每次合法的 API 调用到数据库。
 */
import { headers } from "next/headers";
import { ADMIN_EMAILS } from "@/lib/constants";
import { createAdminClient } from "@/lib/supabase-admin";

// Simple in-memory cache for short-term rate limiting (1 minute)
// Key: IP, Value: Timestamp of last request
const shortTermCache = new Map<string, number>();

export async function checkRateLimit(userId: string, endpoint: string = "analyze", limit?: number): Promise<{ allowed: boolean; reason?: string }> {
  const supabase = createAdminClient();

  // 0. Admin Bypass (Infinite Quota)
  if (userId) {
    try {
      // Check if user is admin via profiles table (faster than auth.admin)
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .single();
      
      if (profile && profile.email && ADMIN_EMAILS.includes(profile.email.toLowerCase())) {
        return { allowed: true };
      }

      // Fallback: profiles may be stale or missing email, so verify against auth.users.
      const { data: authUser, error: authUserError } = await supabase.auth.admin.getUserById(userId);
      if (!authUserError) {
        const email = authUser?.user?.email?.toLowerCase();
        if (email && ADMIN_EMAILS.includes(email)) {
          return { allowed: true };
        }
      }
    } catch (e) {
      console.error("Admin check failed", e);
    }
  }

  const headersList = await headers();
  // Get IP from various headers
  const ip = headersList.get("x-forwarded-for")?.split(",")[0] || 
             headersList.get("x-real-ip") || 
             "unknown";

  if (ip === "unknown") {
    // Fallback or skip if IP cannot be determined (dev env)
    return { allowed: true };
  }

  // 0. Anti-Abuse: Check Origin/Referer (Simple bot protection)
  const origin = headersList.get("origin");
  const host = headersList.get("host"); // e.g. localhost:3000 or myapp.com
  
  // Allow requests from same host or null (server-to-server might be null, but browser actions usually have origin/referer)
  // In Server Actions, Origin header is usually present.
  const isSafeOrigin = !origin || origin.includes(host || "") || origin.includes("localhost") || origin.includes("edreading");
  if (!isSafeOrigin) {
      return { allowed: false, reason: "Invalid Origin" };
  }

  const now = Date.now();

  // 1. In-Memory Short-Term Check (1 minute limit)
  // This is a "soft" limit per instance. 
  const lastRequestTime = shortTermCache.get(ip);
  if (lastRequestTime && now - lastRequestTime < 60 * 1000) {
    return { allowed: false, reason: "请求过于频繁，请1分钟后再试" };
  }

  // 2. Database Long-Term Check (Daily limit)
  // We use the database to enforce the daily limit across all instances
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Determine limit based on userId
  let dailyLimit = limit || (userId ? 10 : 1);

  if (endpoint === "analyze_article") {
    dailyLimit = 5; // Default for article import
  }
  let query = supabase
    .from("api_usage_logs")
    .select("*", { count: "exact", head: true })
    .eq("endpoint", endpoint)
    .gte("created_at", today.toISOString());
    
  if (userId) {
      query = query.eq("user_id", userId);
  } else {
      query = query.eq("ip", ip);
  }

  const { count, error } = await query;

  if (error) {
    console.error("Rate limit check failed:", error);
    // Fail open (allow) if DB check fails to avoid blocking users due to system error
    // But log it.
    return { allowed: true };
  }

  if (count !== null && count >= dailyLimit) {
    return { allowed: false, reason: `今日额度已用完 (${dailyLimit}次/天)` };
  }

  // 3. Update State
  shortTermCache.set(ip, now);
  
  // Async log (fire and forget to not slow down response too much)
  // But since we are in a server action/function, we should await or use waitUntil if available (Next.js specific)
  // For safety, we await a bit or just let it float. 
  // Ideally, use a background job, but here we just insert.
  await supabase.from("api_usage_logs").insert({
    ip,
    endpoint,
    user_id: userId
  });

  return { allowed: true };
}
