import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export function AccountSection({ accent }: { accent: string }) {
  const { user, loading, signOut } = useAuth();
  const [modal, setModal] = useState<null | "auth" | "account">(null);
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const initial = (user?.email || "G").slice(0, 1).toUpperCase();
  const label = user?.email ?? (loading ? "…" : "Guest");

  useEffect(() => {
    if (modal) {
      setErr(null); setInfo(null);
      requestAnimationFrame(() => setMounted(true));
    } else {
      setMounted(false);
    }
  }, [modal]);

  const close = () => { setMounted(false); setTimeout(() => setModal(null), 180); };

  const submit = async () => {
    setErr(null); setInfo(null);
    if (!email || !password) { setErr("Email and password required."); return; }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
        setInfo("Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        close();
        setEmail(""); setPassword("");
      }
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  };

  const google = async () => {
    setErr(null); setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) throw result.error;
      if (result.redirected) return; // browser will navigate
      close();
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ marginTop: "auto", paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
      <style>{`
        @keyframes acc-overlay-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes acc-card-in { from { opacity: 0; transform: translateY(12px) scale(.97) } to { opacity: 1; transform: translateY(0) scale(1) } }
        .acc-pill { transition: background .15s ease, transform .15s ease, border-color .15s ease; }
        .acc-pill:hover { background: rgba(255,255,255,.07) !important; transform: translateY(-1px); }
        .acc-btn { transition: transform .12s ease, box-shadow .15s ease, background .15s ease, border-color .15s ease; }
        .acc-btn:not(:disabled):hover { transform: translateY(-1px); }
        .acc-btn-primary:not(:disabled):hover { box-shadow: 0 10px 26px rgba(30,109,191,.5); }
        .acc-input { transition: border-color .15s ease, box-shadow .15s ease, background .15s ease; }
        .acc-input:focus { border-color: rgba(30,109,191,.6) !important; box-shadow: 0 0 0 3px rgba(30,109,191,.15); background: rgba(0,0,0,.45) !important; }
        .acc-tab { transition: color .15s ease, background .15s ease; }
      `}</style>

      <div style={{ fontSize: 10, letterSpacing: 2, color: "#888", padding: "10px 8px 6px" }}>ACCOUNT</div>

      <button
        onClick={() => setModal(user ? "account" : "auth")}
        className="acc-pill"
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 10,
          padding: "8px 10px", background: "transparent",
          border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10,
          cursor: "pointer", color: "#ddd", textAlign: "left",
        }}
      >
        <div style={{
          width: 30, height: 30, borderRadius: "50%",
          background: `linear-gradient(135deg, ${accent}, ${accent}99)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontWeight: 600, fontSize: 13, flexShrink: 0,
          boxShadow: `0 4px 12px ${accent}55`,
        }}>{initial}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</div>
          <div style={{ fontSize: 10, color: "#888", letterSpacing: 0.5 }}>{user ? "Signed in · manage" : "Tap to sign in"}</div>
        </div>
      </button>

      {modal && (
        <div
          onClick={close}
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(0,0,0,0.65)", backdropFilter: "blur(10px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
            opacity: mounted ? 1 : 0, transition: "opacity .18s ease",
            animation: "acc-overlay-in .2s ease-out both",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(400px, 100%)",
              background: "linear-gradient(180deg, rgba(20,22,30,.98), rgba(10,12,18,.98))",
              border: "1px solid rgba(255,255,255,.1)", borderRadius: 18,
              boxShadow: "0 30px 80px rgba(0,0,0,.6), 0 0 60px rgba(30,109,191,.15)",
              padding: 24, color: "#e7e7ea",
              animation: "acc-card-in .25s cubic-bezier(.2,.9,.3,1.2) both",
              transform: mounted ? "translateY(0)" : "translateY(8px)",
              transition: "transform .18s ease",
            }}
          >
            {modal === "account" && user ? (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: "50%",
                    background: `linear-gradient(135deg, ${accent}, ${accent}99)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff", fontWeight: 600, fontSize: 22,
                    boxShadow: `0 8px 24px ${accent}55`,
                  }}>{initial}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: "#888", letterSpacing: 1 }}>SIGNED IN</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={close} className="acc-btn" style={{
                    flex: 1, padding: "10px 14px", borderRadius: 10,
                    border: "1px solid rgba(255,255,255,.12)", background: "transparent",
                    color: "#ddd", fontSize: 13, cursor: "pointer",
                  }}>Close</button>
                  <button
                    onClick={async () => { await signOut(); close(); }}
                    className="acc-btn"
                    style={{
                      flex: 1, padding: "10px 14px", borderRadius: 10,
                      border: "1px solid rgba(255,118,118,.3)", background: "rgba(255,118,118,.08)",
                      color: "#ff9b9b", fontSize: 13, fontWeight: 600, cursor: "pointer",
                    }}
                  >Sign out</button>
                </div>
              </>
            ) : (
              <>
                <div style={{ textAlign: "center", marginBottom: 18 }}>
                  <div style={{
                    width: 44, height: 44, margin: "0 auto 12px", borderRadius: 12,
                    background: `linear-gradient(135deg, ${accent}, ${accent}66)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 20, color: "#fff",
                    boxShadow: `0 8px 24px ${accent}55`,
                  }}>✦</div>
                  <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 600 }}>
                    {mode === "signin" ? "Welcome back" : "Create your account"}
                  </h2>
                  <p style={{ margin: 0, fontSize: 12, color: "#888" }}>
                    {mode === "signin" ? "Sign in to save your maps and sync across devices" : "Free forever · no credit card required"}
                  </p>
                </div>

                <button
                  onClick={google}
                  disabled={busy}
                  className="acc-btn"
                  style={{
                    width: "100%", padding: "11px 14px", borderRadius: 10,
                    border: "1px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.06)",
                    color: "#fff", fontSize: 13, fontWeight: 500, cursor: busy ? "wait" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                    marginBottom: 14,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C41.4 35.4 44 30.1 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
                  Continue with Google
                </button>

                <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "14px 0", color: "#666", fontSize: 10, letterSpacing: 1 }}>
                  <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,.08)" }} />
                  OR
                  <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,.08)" }} />
                </div>

                <div style={{ display: "flex", gap: 4, padding: 4, background: "rgba(0,0,0,.3)", borderRadius: 10, marginBottom: 12 }}>
                  {(["signin", "signup"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => { setMode(m); setErr(null); setInfo(null); }}
                      className="acc-tab"
                      style={{
                        flex: 1, padding: "7px 10px", fontSize: 12,
                        borderRadius: 7, border: "none",
                        background: mode === m ? `linear-gradient(135deg, ${accent}, ${accent}cc)` : "transparent",
                        color: mode === m ? "#fff" : "#888", cursor: "pointer",
                        fontWeight: mode === m ? 600 : 400,
                        boxShadow: mode === m ? `0 4px 12px ${accent}55` : "none",
                      }}
                    >{m === "signin" ? "Sign in" : "Sign up"}</button>
                  ))}
                </div>

                <input
                  type="email" placeholder="email@example.com"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  className="acc-input" style={inputStyle}
                />
                <input
                  type="password" placeholder="password"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") void submit(); }}
                  className="acc-input" style={{ ...inputStyle, marginTop: 8 }}
                />

                {err && <div style={{ marginTop: 10, fontSize: 11, color: "#ff8b8b", padding: "6px 10px", background: "rgba(255,118,118,.08)", borderRadius: 6, border: "1px solid rgba(255,118,118,.2)" }}>{err}</div>}
                {info && <div style={{ marginTop: 10, fontSize: 11, color: "#7ee787", padding: "6px 10px", background: "rgba(126,231,135,.08)", borderRadius: 6, border: "1px solid rgba(126,231,135,.2)" }}>{info}</div>}

                <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                  <button onClick={close} className="acc-btn" style={{
                    padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,.12)",
                    background: "transparent", color: "#aaa", fontSize: 13, cursor: "pointer",
                  }}>Cancel</button>
                  <button
                    disabled={busy}
                    onClick={() => void submit()}
                    className="acc-btn acc-btn-primary"
                    style={{
                      flex: 1, padding: "10px 14px", borderRadius: 10, border: "none",
                      background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
                      color: "#fff", fontSize: 13, fontWeight: 600,
                      cursor: busy ? "wait" : "pointer", opacity: busy ? 0.7 : 1,
                      boxShadow: `0 6px 18px ${accent}55`,
                    }}
                  >{busy ? "…" : mode === "signin" ? "Sign in" : "Create account"}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px",
  background: "rgba(0,0,0,0.35)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8, color: "#fff", fontSize: 13, outline: "none",
  fontFamily: "inherit", boxSizing: "border-box",
};
