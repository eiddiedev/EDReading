import { createClient } from "@/lib/supabase-server";
import PortalClient from "./portal-client";
import { PortalLink } from "@/types";

export default async function PortalPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let initialLinks: PortalLink[] = [];

  if (user) {
    const { data } = await supabase
      .from('portal_links')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) {
      initialLinks = data.map((d: any) => ({
        id: d.id,
        title: d.title,
        url: d.url,
        description: d.description,
        icon: d.icon,
        openMode: d.open_mode as "iframe" | "new_tab",
      }));
    }
  }

  return <PortalClient initialLinks={initialLinks} user={user} />;
}
