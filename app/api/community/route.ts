import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ADMIN_EMAIL } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ items: [] }, { headers: { "Cache-Control": "no-store" } });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const tenDaysAgoString = tenDaysAgo.toISOString();
    const { data: dbArticles, error } = await supabase
      .from("articles")
      .select("*")
      .eq("is_public", true)
      .gt("created_at", tenDaysAgoString)
      .order("created_at", { ascending: false })
      .limit(50);
    
    if (error) throw error;

    return NextResponse.json({ items: dbArticles || [] }, { headers: { "Cache-Control": "no-store" } });
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
    if (userData.user.email !== ADMIN_EMAIL) {
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
