/**
 * 社区文章 API (Community)
 * 作用：获取公共社区的高质量文章列表，以及管理员删除文章。
 * 定义：GET (获取列表) 和 DELETE (管理员删除) 接口。
 * 逻辑：
 * 1. GET: 查询 Supabase `articles` 表中 `is_public=true` 的文章，按时间倒序排列。
 * 2. DELETE: 验证管理员权限，软删除（取消公开）并硬删除文章记录。
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ADMIN_EMAIL, ADMIN_EMAILS } from "@/lib/constants";

export const dynamic = "force-dynamic";

/**
 * 获取社区 Feed 的公开文章。
 * 
 * @route GET /api/community
 * @returns {object} 最近公开文章的列表
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedLevel = searchParams.get("level")?.trim() || null;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ items: [] }, { headers: { "Cache-Control": "no-store" } });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const tenDaysAgoString = tenDaysAgo.toISOString();
    let query = supabase
      .from("articles")
      .select("id, title, title_zh, difficulty, word_count, tags, topic, created_at, is_public")
      .eq("is_public", true)
      .gt("created_at", tenDaysAgoString)
      .order("created_at", { ascending: false })
      .limit(50);

    if (requestedLevel) {
      query = query.or(`difficulty.eq.${requestedLevel},tags.cs.{${requestedLevel}}`);
    }

    const { data: dbArticles, error } = await query;
    
    if (error) throw error;

    return NextResponse.json(
      { items: dbArticles || [] },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Fetch Error:", error);
    return NextResponse.json({ items: [] }, { headers: { "Cache-Control": "no-store" } });
  }
}

export async function DELETE(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "Missing Supabase config" }, { status: 500 });
    }

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!ADMIN_EMAILS.includes(userData.user.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const id = String(body?.id || "");
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const { error: unpublishError } = await supabase
      .from("articles")
      .update({ is_public: false })
      .eq("id", id);
    if (unpublishError) {
      return NextResponse.json({ error: "Delete failed" }, { status: 500 });
    }

    const { error: deleteError } = await supabase.from("articles").delete().eq("id", id);
    if (deleteError) {
      console.error("Delete Error:", deleteError);
    }

    return NextResponse.json({ ok: true, deleted: !deleteError });
  } catch (error) {
    console.error("Delete Error:", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
