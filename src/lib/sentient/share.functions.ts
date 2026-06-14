import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const Input = z.object({
  mapId: z.string().uuid(),
  token: z.string().uuid(),
});

export const joinMapByToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => Input.parse(input))
  .handler(async ({ data, context }) => {
    const { userId, claims } = context as { userId: string; claims: { email?: string } };
    const email = (claims?.email ?? "").toLowerCase();
    if (!email) throw new Error("No email on session");

    // Validate token + share config (admin bypasses RLS).
    const { data: map, error } = await supabaseAdmin
      .from("saved_maps")
      .select("id,user_id,share_enabled,share_role,share_token")
      .eq("id", data.mapId)
      .maybeSingle();
    if (error || !map) throw new Error("Map not found");
    if (!map.share_enabled || map.share_token !== data.token) {
      throw new Error("Share link is disabled or invalid");
    }
    // Owner doesn't need a collaborator row.
    if (map.user_id === userId) return { ok: true, role: "owner" as const };

    const role = map.share_role === "editor" ? "editor" : "viewer";

    // Upsert collaborator row using admin client (only this token-validated path can do it).
    const { error: upsertErr } = await supabaseAdmin
      .from("map_collaborators")
      .upsert(
        {
          map_id: map.id,
          user_email: email,
          role,
          invited_by: map.user_id,
        },
        { onConflict: "map_id,user_email", ignoreDuplicates: false },
      );
    if (upsertErr) throw upsertErr;

    return { ok: true, role };
  });
