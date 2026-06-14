import { useEffect, useState } from "react";
import {
  createCloudMap,
  fetchCloudMap,
  inviteCollaborator,
  listCollaborators,
  removeCollaborator,
  updateCloudMap,
  updateCollaboratorRole,
  type CloudMap,
  type Collaborator,
  type CollabRole,
} from "@/lib/sentient/cloud";
import { useAuth } from "@/lib/auth";

export function ShareDrawer({
  open,
  onClose,
  mapId,
  setMapId,
  question,
  nodes,
  edges,
  strokes,
  accent,
}: {
  open: boolean;
  onClose: () => void;
  mapId: string | null;
  setMapId: (id: string) => void;
  question: string;
  nodes: unknown[];
  edges: unknown[];
  strokes: unknown[];
  accent: string;
}) {
  const { user } = useAuth();
  const [map, setMap] = useState<CloudMap | null>(null);
  const [collabs, setCollabs] = useState<Collaborator[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<CollabRole>("editor");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || !mapId) return;
    let cancel = false;
    (async () => {
      try {
        const [m, cs] = await Promise.all([fetchCloudMap(mapId), listCollaborators(mapId)]);
        if (cancel) return;
        setMap(m);
        setCollabs(cs);
      } catch (e) {
        setErr((e as Error).message);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [open, mapId]);

  if (!open) return null;

  const isOwner = !!user && !!map && map.user_id === user.id;

  const saveAndShare = async () => {
    if (!user) {
      setErr("Sign in first to share this map.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const created = await createCloudMap({
        name: question || "Untitled map",
        question,
        nodes,
        edges,
        strokes,
      });
      setMapId(created.id);
      setMap(created);
      setCollabs([]);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const toggleShare = async (enabled: boolean) => {
    if (!map) return;
    setBusy(true);
    try {
      await updateCloudMap(map.id, { share_enabled: enabled });
      setMap({ ...map, share_enabled: enabled });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const setShareRole = async (role: "viewer" | "editor") => {
    if (!map) return;
    setBusy(true);
    try {
      await updateCloudMap(map.id, { share_role: role });
      setMap({ ...map, share_role: role });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const shareUrl =
    map && map.share_token
      ? `${window.location.origin}/canvas?map=${map.id}&token=${map.share_token}`
      : "";

  const invite = async () => {
    if (!map) return;
    setBusy(true);
    setErr(null);
    try {
      await inviteCollaborator(map.id, inviteEmail, inviteRole);
      setInviteEmail("");
      setCollabs(await listCollaborators(map.id));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 80 }} />
      <div
        className="glass"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: 420,
          zIndex: 81,
          padding: 20,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          borderRadius: 0,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: 16, color: "#fff" }}>Share & collaborate</h2>
          <button onClick={onClose} className="icon-btn" aria-label="Close share dialog">
            ✕
          </button>
        </div>

        {!user && (
          <div style={info}>Sign in to save the map to the cloud and invite teammates.</div>
        )}

        {user && !mapId && (
          <button
            disabled={busy}
            onClick={saveAndShare}
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              border: "none",
              background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {busy ? "Saving…" : "Save to cloud & enable sharing"}
          </button>
        )}

        {map && (
          <>
            <section style={section}>
              <div style={sectionTitle}>PUBLIC LINK</div>
              <label style={row}>
                <input
                  type="checkbox"
                  checked={map.share_enabled}
                  onChange={(e) => toggleShare(e.target.checked)}
                  disabled={!isOwner || busy}
                />
                <span style={{ color: "#ddd", fontSize: 13 }}>Anyone with the link can join</span>
              </label>
              {map.share_enabled && (
                <>
                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    {(["viewer", "editor"] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => setShareRole(r)}
                        disabled={!isOwner || busy}
                        style={{
                          flex: 1,
                          padding: "6px 8px",
                          borderRadius: 6,
                          border: "1px solid rgba(255,255,255,0.1)",
                          background: map.share_role === r ? `${accent}33` : "transparent",
                          color: map.share_role === r ? "#fff" : "#aaa",
                          cursor: "pointer",
                          fontSize: 12,
                          fontWeight: map.share_role === r ? 600 : 400,
                        }}
                      >
                        Join as {r}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                    <input value={shareUrl} readOnly style={{ ...inputStyle, flex: 1 }} />
                    <button
                      onClick={async () => {
                        await navigator.clipboard.writeText(shareUrl);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                      }}
                      className="pill-btn"
                    >
                      {copied ? "✓ Copied" : "Copy"}
                    </button>
                  </div>
                </>
              )}
            </section>

            <section style={section}>
              <div style={sectionTitle}>INVITE BY EMAIL</div>
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  type="email"
                  placeholder="teammate@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}
                  disabled={!isOwner}
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as CollabRole)}
                  style={{ ...inputStyle, width: 100 }}
                  disabled={!isOwner}
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                </select>
                <button
                  onClick={invite}
                  disabled={!isOwner || busy || !inviteEmail.trim()}
                  className="pill-btn"
                >
                  Invite
                </button>
              </div>
            </section>

            <section style={section}>
              <div style={sectionTitle}>TEAM ({collabs.length})</div>
              {collabs.length === 0 && (
                <div style={{ color: "#666", fontSize: 12 }}>No teammates yet.</div>
              )}
              {collabs.map((c) => (
                <div
                  key={c.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 4px",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      background: `linear-gradient(135deg, ${accent}, ${accent}99)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: 11,
                    }}
                  >
                    {c.user_email.slice(0, 1).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        color: "#fff",
                        fontSize: 12,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {c.user_email}
                    </div>
                  </div>
                  {isOwner ? (
                    <select
                      value={c.role}
                      onChange={async (e) => {
                        await updateCollaboratorRole(c.id, e.target.value as CollabRole);
                        setCollabs(await listCollaborators(map.id));
                      }}
                      style={{ ...inputStyle, width: 90, padding: "4px 6px" }}
                    >
                      <option value="viewer">viewer</option>
                      <option value="editor">editor</option>
                      <option value="owner">owner</option>
                    </select>
                  ) : (
                    <span style={{ color: "#aaa", fontSize: 11 }}>{c.role}</span>
                  )}
                  {isOwner && (
                    <button
                      onClick={async () => {
                        await removeCollaborator(c.id);
                        setCollabs(await listCollaborators(map.id));
                      }}
                      className="icon-btn"
                      title="Remove"
                      aria-label="Remove collaborator"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </section>
          </>
        )}

        {err && <div style={{ color: "#ff7676", fontSize: 12 }}>{err}</div>}
      </div>
    </>
  );
}

const section: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  padding: 12,
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 10,
};
const sectionTitle: React.CSSProperties = {
  fontSize: 9,
  letterSpacing: 1.5,
  color: "#888",
  fontWeight: 700,
};
const row: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8 };
const inputStyle: React.CSSProperties = {
  padding: "7px 9px",
  background: "rgba(0,0,0,0.3)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 6,
  color: "#fff",
  fontSize: 12,
  outline: "none",
};
const info: React.CSSProperties = {
  padding: 10,
  background: "rgba(255,255,255,0.04)",
  borderRadius: 8,
  color: "#aaa",
  fontSize: 12,
};
