// Client-side helpers for cloud-backed maps & collaboration.
import { supabase } from "@/integrations/supabase/client";

export type CollabRole = "owner" | "editor" | "viewer";

export type Collaborator = {
  id: string;
  map_id: string;
  user_email: string;
  role: CollabRole;
  invited_by: string;
  created_at: string;
};

export type CloudMap = {
  id: string;
  user_id: string;
  name: string;
  question: string;
  nodes: unknown[];
  edges: unknown[];
  strokes: unknown[];
  mode: string;
  share_enabled: boolean;
  share_role: "viewer" | "editor";
  share_token: string | null;
  updated_at: string;
};

export async function createCloudMap(payload: {
  name: string;
  question: string;
  nodes: unknown[];
  edges: unknown[];
  strokes: unknown[];
}) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not signed in");
  const { data, error } = await supabase
    .from("saved_maps")
    .insert({
      user_id: u.user.id,
      name: payload.name || "Untitled map",
      question: payload.question,
      nodes: payload.nodes as never,
      edges: payload.edges as never,
      strokes: payload.strokes as never,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as CloudMap;
}

export async function updateCloudMap(
  id: string,
  patch: Partial<Pick<CloudMap, "name" | "nodes" | "edges" | "strokes" | "share_enabled" | "share_role">>,
) {
  const { error } = await supabase.from("saved_maps").update(patch as never).eq("id", id);
  if (error) throw error;
}

export async function fetchCloudMap(id: string) {
  const { data, error } = await supabase
    .from("saved_maps")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as CloudMap | null;
}

export async function listCollaborators(mapId: string) {
  const { data, error } = await supabase
    .from("map_collaborators")
    .select("*")
    .eq("map_id", mapId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Collaborator[];
}

export async function inviteCollaborator(mapId: string, email: string, role: CollabRole) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not signed in");
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) throw new Error("Email required");
  const { error } = await supabase
    .from("map_collaborators")
    .insert({ map_id: mapId, user_email: trimmed, role, invited_by: u.user.id });
  if (error) throw error;
}

export async function updateCollaboratorRole(id: string, role: CollabRole) {
  const { error } = await supabase.from("map_collaborators").update({ role }).eq("id", id);
  if (error) throw error;
}

export async function removeCollaborator(id: string) {
  const { error } = await supabase.from("map_collaborators").delete().eq("id", id);
  if (error) throw error;
}
