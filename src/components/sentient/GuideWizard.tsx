import { useEffect, useState } from "react";

type Step = {
  title: string;
  body: string;
  bullets?: string[];
  emoji: string;
  tip?: string;
};

const STEPS: Step[] = [
  {
    emoji: "✦",
    title: "Welcome to SENTIENT",
    body: "An AI thinking partner that maps ideas, tensions, and synthesis on an interactive canvas — instead of giving you a wall of text.",
    bullets: ["Ask any question", "Watch your thinking get mapped visually", "Drill into any node to go deeper"],
    tip: "Best used on desktop for the full canvas experience.",
  },
  {
    emoji: "⌂",
    title: "The Home Page",
    body: "This is your launchpad. Type any question or pick a starter prompt — SENTIENT will turn it into a living mind-map.",
    bullets: ["Press Enter to submit", "Shift+Enter for a newline", "Recent questions appear in the sidebar"],
  },
  {
    emoji: "◫",
    title: "The Canvas",
    body: "Your ideas come alive as nodes connected by tensions and synthesis. Explore freely — nothing is locked in.",
    bullets: ["Drag nodes to rearrange", "Scroll to zoom, drag empty space to pan", "Click any node to open it"],
  },
  {
    emoji: "◇",
    title: "Node Tools",
    body: "Each node is a mini workspace. Right-click or open any node to unlock rich AI tools.",
    bullets: ["Chat with the node in context", "Generate diagrams, tables, roadmaps", "Create docs, sketches and images inline"],
  },
  {
    emoji: "✎",
    title: "Drawing & Sketching",
    body: "Sketch directly on the canvas. SENTIENT can interpret your drawings and turn rough ideas into structured thought.",
    bullets: ["Free-hand annotations", "AI-assisted shape recognition", "Export sketches with your map"],
  },
  {
    emoji: "◉",
    title: "Voice Mode",
    body: "Talk to SENTIENT hands-free. Ask follow-ups, dictate questions, and hear answers spoken back naturally.",
    bullets: ["Real-time transcription", "Natural voice responses", "Great for brainstorming on the go"],
  },
  {
    emoji: "◫",
    title: "Memory & Mind Maps",
    body: "Every map is auto-saved. Revisit past explorations, branch new ideas, and build a personal knowledge graph over time.",
    bullets: ["Browse all saved maps", "Branch from any node", "Search across your history"],
  },
  {
    emoji: "◇",
    title: "MCP Connectors",
    body: "Plug SENTIENT into your tools via MCP — bring in real data, files, and external context to ground every answer.",
    bullets: ["Connect Notion, GitHub, Drive & more", "Ground answers in your real data", "Toggle connectors per session"],
  },
  {
    emoji: "↗",
    title: "Share & Export",
    body: "Share a read-only link to any map, or export your work to take it anywhere.",
    bullets: ["One-click share links", "Export as PNG, PDF, or Markdown", "Embed in docs and slides"],
  },
  {
    emoji: "⚙",
    title: "Settings & Account",
    body: "Tune SENTIENT to your taste. Switch models, manage your account, and configure defaults.",
    bullets: ["Pick your reasoning model", "Manage profile & sign-out", "Reopen this guide anytime"],
  },
  {
    emoji: "→",
    title: "You're ready",
    body: "Try a prompt on the home page or jump straight into the canvas. You can reopen this guide anytime from the sidebar.",
    tip: "Pro tip: start broad, then drill into the most interesting node.",
  },
];

const STORAGE_KEY = "sentient-guide-seen-v1";
const REOPEN_PREF_KEY = "sentient-guide-reopen-pref";

export function GuideWizard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [i, setI] = useState(0);
  const [dontShow, setDontShow] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (open) {
      setI(0);
      try { setDontShow(localStorage.getItem(REOPEN_PREF_KEY) === "hidden"); } catch { /* ignore */ }
      requestAnimationFrame(() => setMounted(true));
    } else {
      setMounted(false);
    }
  }, [open]);

  if (!open) return null;
  const step = STEPS[i];
  const last = i === STEPS.length - 1;

  const finish = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
      localStorage.setItem(REOPEN_PREF_KEY, dontShow ? "hidden" : "show");
    } catch { /* ignore */ }
    setMounted(false);
    setTimeout(onClose, 180);
  };

  return (
    <>
      <style>{`
        @keyframes sentient-overlay-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes sentient-card-in { from { opacity: 0; transform: translateY(16px) scale(.96) } to { opacity: 1; transform: translateY(0) scale(1) } }
        @keyframes sentient-step-in { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes sentient-glow { 0%,100% { box-shadow: 0 10px 30px rgba(30,109,191,.4), 0 0 0 0 rgba(30,109,191,.5) } 50% { box-shadow: 0 10px 40px rgba(30,109,191,.6), 0 0 0 14px rgba(30,109,191,0) } }
        @keyframes sentient-shimmer { 0% { background-position: -200% 0 } 100% { background-position: 200% 0 } }
        .sentient-wizard-overlay { animation: sentient-overlay-in .25s ease-out both; }
        .sentient-wizard-card { animation: sentient-card-in .35s cubic-bezier(.2,.9,.3,1.2) both; }
        .sentient-wizard-step { animation: sentient-step-in .35s ease-out both; }
        .sentient-wizard-icon { animation: sentient-glow 2.4s ease-in-out infinite; }
        .sentient-wizard-progress { background: linear-gradient(90deg, #1e6dbf, #4ea3ff, #1e6dbf); background-size: 200% 100%; animation: sentient-shimmer 2s linear infinite; }
        .sentient-wizard-btn-primary { transition: transform .15s ease, box-shadow .2s ease; }
        .sentient-wizard-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 10px 28px rgba(30,109,191,.55); }
        .sentient-wizard-btn-ghost { transition: background .2s ease, color .2s ease, border-color .2s ease; }
        .sentient-wizard-btn-ghost:hover { background: rgba(255,255,255,.07); color: #fff; }
        .sentient-wizard-dot { transition: all .3s cubic-bezier(.2,.9,.3,1.2); }
      `}</style>
      <div
        className="sentient-wizard-overlay"
        style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(0,0,0,0.7)", backdropFilter: "blur(10px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
          opacity: mounted ? 1 : 0, transition: "opacity .2s ease",
        }}
        onClick={finish}
      >
        <div
          className="sentient-wizard-card"
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "min(580px, 100%)",
            background: "linear-gradient(180deg, rgba(20,22,30,0.98), rgba(10,12,18,0.98))",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 22,
            boxShadow: "0 30px 80px rgba(0,0,0,0.6), 0 0 80px rgba(30,109,191,0.18)",
            color: "#e7e7ea",
            overflow: "hidden",
            display: "flex", flexDirection: "column",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <span style={{ fontSize: 11, letterSpacing: 2, color: "#888" }}>GUIDE · {i + 1} / {STEPS.length}</span>
            <button
              onClick={finish}
              className="sentient-wizard-btn-ghost"
              style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.12)", color: "#aaa", borderRadius: 6, width: 28, height: 28, cursor: "pointer" }}
            >✕</button>
          </div>

          <div style={{ height: 3, background: "rgba(255,255,255,0.05)", position: "relative", overflow: "hidden" }}>
            <div
              className="sentient-wizard-progress"
              style={{
                position: "absolute", inset: 0,
                width: `${((i + 1) / STEPS.length) * 100}%`,
                transition: "width .4s cubic-bezier(.2,.9,.3,1.2)",
              }}
            />
          </div>

          <div key={i} className="sentient-wizard-step" style={{ padding: "32px 28px 20px", textAlign: "center" }}>
            <div className="sentient-wizard-icon" style={{
              width: 68, height: 68, margin: "0 auto 18px",
              borderRadius: 18,
              background: "linear-gradient(135deg, #1e6dbf, #1e6dbf55)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 30, color: "#fff",
            }}>{step.emoji}</div>
            <h2 style={{ margin: "0 0 10px", fontSize: 22, fontWeight: 600, letterSpacing: 0.3 }}>{step.title}</h2>
            <p style={{ margin: "0 auto", maxWidth: 460, fontSize: 14, lineHeight: 1.6, color: "#bbb" }}>{step.body}</p>

            {step.bullets && (
              <ul style={{ listStyle: "none", padding: 0, margin: "20px auto 0", maxWidth: 400, textAlign: "left" }}>
                {step.bullets.map((b, idx) => (
                  <li
                    key={b}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: 10, padding: "6px 0",
                      fontSize: 13, color: "#ccc",
                      animation: `sentient-step-in .4s ease-out ${0.1 + idx * 0.07}s both`,
                    }}
                  >
                    <span style={{ color: "#1e6dbf", marginTop: 2 }}>→</span>{b}
                  </li>
                ))}
              </ul>
            )}

            {step.tip && (
              <div style={{
                marginTop: 18, padding: "10px 14px",
                background: "rgba(30,109,191,0.08)",
                border: "1px solid rgba(30,109,191,0.25)",
                borderRadius: 10, fontSize: 12, color: "#9cc7f5",
              }}>
                ✦ {step.tip}
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 6, justifyContent: "center", padding: "0 20px 14px" }}>
            {STEPS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setI(idx)}
                className="sentient-wizard-dot"
                style={{
                  width: idx === i ? 26 : 8, height: 8, borderRadius: 4,
                  background: idx === i ? "#1e6dbf" : idx < i ? "rgba(30,109,191,.4)" : "rgba(255,255,255,0.15)",
                  border: "none", cursor: "pointer",
                }}
              />
            ))}
          </div>

          {last && (
            <label style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "0 22px 12px", fontSize: 12, color: "#aaa", cursor: "pointer",
              animation: "sentient-step-in .3s ease-out both",
            }}>
              <input
                type="checkbox"
                checked={dontShow}
                onChange={(e) => setDontShow(e.target.checked)}
                style={{ accentColor: "#1e6dbf" }}
              />
              Don't show this guide again on startup (you can reopen it from the sidebar)
            </label>
          )}

          <div style={{ display: "flex", gap: 10, padding: "14px 20px 20px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <button
              onClick={finish}
              className="sentient-wizard-btn-ghost"
              style={{ flex: "0 0 auto", background: "transparent", border: "1px solid rgba(255,255,255,0.12)", color: "#aaa", padding: "10px 16px", borderRadius: 10, fontSize: 13, cursor: "pointer" }}
            >Skip</button>
            <button
              onClick={() => setI(Math.max(0, i - 1))}
              disabled={i === 0}
              className="sentient-wizard-btn-ghost"
              style={{ flex: "0 0 auto", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#ddd", padding: "10px 16px", borderRadius: 10, fontSize: 13, cursor: i === 0 ? "not-allowed" : "pointer", opacity: i === 0 ? 0.4 : 1 }}
            >← Back</button>
            <button
              onClick={() => (last ? finish() : setI(i + 1))}
              className="sentient-wizard-btn-primary"
              style={{ flex: 1, background: "linear-gradient(135deg, #1e6dbf, #1e6dbfcc)", color: "#fff", border: "none", padding: "10px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: "0 6px 18px rgba(30,109,191,0.35)" }}
            >{last ? "Get started ✦" : "Next →"}</button>
          </div>
        </div>
      </div>
    </>
  );
}

export function useGuideAutoOpen() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      const pref = localStorage.getItem(REOPEN_PREF_KEY);
      // Show on first visit, OR if user hasn't opted out
      if (!seen || pref !== "hidden") setOpen(true);
    } catch { /* ignore */ }
  }, []);
  return { open, setOpen };
}
