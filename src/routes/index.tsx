import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GuideWizard, useGuideAutoOpen } from "@/components/sentient/GuideWizard";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "SENTIENT — AI-powered reasoning and mind mapping" },
      { name: "description", content: "Ask anything. SENTIENT maps ideas, tensions, evidence, and synthesis on an interactive AI reasoning canvas." },
      { property: "og:title", content: "SENTIENT — AI-powered reasoning and mind mapping" },
      { property: "og:description", content: "Ask anything. SENTIENT maps ideas, tensions, evidence, and synthesis on an interactive AI reasoning canvas." },
      { property: "og:url", content: "https://sentientai.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://sentientai.lovable.app/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "SENTIENT",
          url: "https://sentientai.lovable.app",
          description: "AI-powered reasoning and mind-mapping canvas that maps ideas, tensions, and synthesis from any question.",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "SENTIENT",
          url: "https://sentientai.lovable.app",
          description: "Ask a question and SENTIENT maps ideas, tensions, evidence, and synthesis on an interactive AI reasoning canvas.",
        }),
      },
    ],
  }),
});

const itemStyle: React.CSSProperties = {
  textAlign: "left",
  background: "transparent",
  border: "1px solid transparent",
  color: "#e8e8ec",
  padding: "11px 12px",
  borderRadius: 9,
  fontSize: 15,
  fontWeight: 500,
  letterSpacing: 0.2,
  cursor: "pointer",
  width: "100%",
};

function Home() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const { open: guideOpen, setOpen: setGuideOpen } = useGuideAutoOpen();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [recent, setRecent] = useState<string[]>([]);
  const [plusOpen, setPlusOpen] = useState(false);
  const [attachments, setAttachments] = useState<{ name: string; kind: string }[]>([]);

  useEffect(() => {
    if (!plusOpen) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest("[data-plus-menu]")) setPlusOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [plusOpen]);

  const pickFile = (accept: string, kind: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    if (kind === "camera") input.setAttribute("capture", "environment");
    input.onchange = () => {
      const f = input.files?.[0];
      if (f) setAttachments((prev) => [...prev, { name: f.name, kind }]);
    };
    input.click();
    setPlusOpen(false);
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem("sentient-recent-questions");
      setRecent(raw ? (JSON.parse(raw) as string[]).slice(0, 6) : []);
    } catch {
      setRecent([]);
    }
  }, []);

  const submit = (override?: string) => {
    const question = (override ?? q).trim();
    if (!question) return;
    try {
      const raw = localStorage.getItem("sentient-recent-questions");
      const list = raw ? (JSON.parse(raw) as string[]) : [];
      const next = [question, ...list.filter((x) => x !== question)].slice(0, 12);
      localStorage.setItem("sentient-recent-questions", JSON.stringify(next));
    } catch {
      /* ignore */
    }
    navigate({ to: "/canvas", search: { q: question } });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        display: "flex",
        background:
          "radial-gradient(ellipse at top left, #0a121f 0%, #060608 50%, #050505 100%)",
        color: "#e7e7ea",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes sentient-bg-drift { 0%,100% { transform: translate(0,0) scale(1) } 50% { transform: translate(3%,-2%) scale(1.04) } }
        @keyframes sentient-fade-up { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes sentient-fade-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes sentient-slide-in { from { opacity: 0; transform: translateX(-12px) } to { opacity: 1; transform: translateX(0) } }
        @keyframes sentient-pulse-soft { 0%,100% { opacity: .55 } 50% { opacity: 1 } }
        @keyframes sentient-letter-spacing { from { letter-spacing: 28px; opacity: 0; filter: blur(8px) } to { letter-spacing: 12px; opacity: 1; filter: blur(0) } }
        @keyframes sentient-shimmer { 0% { background-position: -200% 0 } 100% { background-position: 200% 0 } }
        .s-bg-orb { position: absolute; border-radius: 50%; filter: blur(90px); pointer-events: none; opacity: .32; animation: sentient-bg-drift 18s cubic-bezier(.45,.05,.55,.95) infinite; will-change: transform; }
        .s-fade-up { animation: sentient-fade-up .55s cubic-bezier(.22,.9,.3,1) both; will-change: transform, opacity; }
        .s-fade-in { animation: sentient-fade-in .55s cubic-bezier(.22,.9,.3,1) both; }
        .s-slide-in { animation: sentient-slide-in .5s cubic-bezier(.22,.9,.3,1) both; }
        .s-title { animation: sentient-letter-spacing .9s cubic-bezier(.22,.9,.3,1) both; will-change: letter-spacing, opacity; }
        .s-sub { animation: sentient-pulse-soft 3.6s ease-in-out infinite; }
        .s-cta { transition: transform .25s cubic-bezier(.22,.9,.3,1), box-shadow .25s cubic-bezier(.22,.9,.3,1); position: relative; overflow: hidden; }
        .s-cta:not(:disabled):hover { transform: translateY(-2px); box-shadow: 0 16px 40px rgba(30,109,191,.5) !important; }
        .s-cta::before { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgba(255,255,255,.18), transparent); background-size: 200% 100%; animation: sentient-shimmer 3.6s linear infinite; pointer-events: none; }
        .s-chip { transition: transform .25s cubic-bezier(.22,.9,.3,1), background .25s ease, color .25s ease, border-color .25s ease; }
        .s-chip:hover { transform: translateY(-2px); background: rgba(30,109,191,.15) !important; color: #fff !important; border-color: rgba(30,109,191,.4) !important; }
        .s-side-item { transition: background .25s ease, color .25s ease, transform .25s cubic-bezier(.22,.9,.3,1); }
        .s-side-item:hover { background: rgba(255,255,255,.05) !important; color: #fff !important; transform: translateX(3px); }
        .s-input { transition: border-color .25s ease, box-shadow .25s ease; }
        .s-input:focus { border-color: rgba(30,109,191,.55) !important; box-shadow: 0 0 0 3px rgba(30,109,191,.15); }
        @media (prefers-reduced-motion: reduce) { .s-fade-up, .s-fade-in, .s-slide-in, .s-title, .s-bg-orb, .s-sub, .s-cta::before { animation: none !important; } }
      `}</style>

      <div className="s-bg-orb" style={{ width: 520, height: 520, background: "#1e6dbf", top: -120, left: -120 }} />
      <div className="s-bg-orb" style={{ width: 420, height: 420, background: "#7a3bd6", bottom: -100, right: -80, animationDelay: "-6s" }} />
      <div className="s-bg-orb" style={{ width: 320, height: 320, background: "#1e6dbf", top: "40%", right: "20%", opacity: .15, animationDelay: "-12s" }} />
      {sidebarOpen && (
        <aside
          style={{
            width: 268,
            minWidth: 268,
            padding: 14,
            display: "flex",
            flexDirection: "column",
            gap: 5,
            background: "rgba(12,12,14,0.55)",
            backdropFilter: "blur(22px) saturate(1.5)",
            WebkitBackdropFilter: "blur(22px) saturate(1.5)",
            borderRight: "1px solid rgba(255,255,255,0.07)",
            overflowY: "auto",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 8px 18px" }}>
            <button
              onClick={() => setSidebarOpen(false)}
              title="Hide sidebar"
              aria-label="Hide sidebar"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#eee",
                width: 34, height: 34, borderRadius: 9, cursor: "pointer",
                fontSize: 15,
              }}
            >
              ⟨
            </button>
            <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: 3.2 }}>SENTIENT</span>
          </div>

          {(() => {
            const sideItems: Array<{ label?: string; section?: string; onClick?: () => void }> = [
              { section: "WORKSPACE" },
              { label: "⌂  Home" },
              { label: "◫  Open canvas", onClick: () => navigate({ to: "/canvas", search: {} }) },
              { section: "TOOLS" },
              { label: "◫  Memory / mind maps", onClick: () => navigate({ to: "/canvas", search: { open: "memory" } }) },
              { label: "◇  MCP connectors", onClick: () => navigate({ to: "/canvas", search: { open: "mcp" } }) },
              { label: "◉  Voice mode", onClick: () => navigate({ to: "/canvas", search: { open: "voice" } }) },
              { label: "⚙  Settings", onClick: () => navigate({ to: "/canvas", search: { open: "settings" } }) },
              { label: "?  Feature guide", onClick: () => setGuideOpen(true) },
            ];
            return sideItems.map((it, i) => {
              const delay = `${0.05 + i * 0.04}s`;
              if (it.section) {
                return (
                  <div
                    key={`sec-${it.section}`}
                    className="s-slide-in"
                    style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2.4, color: "#9a9aa8", textTransform: "uppercase", padding: i === 0 ? "8px 10px" : "18px 10px 8px", animationDelay: delay }}
                  >
                    {it.section}
                  </div>
                );
              }
              return (
                <button
                  key={it.label}
                  className="s-side-item s-slide-in"
                  style={{ ...itemStyle, animationDelay: delay }}
                  onClick={it.onClick}
                >
                  {it.label}
                </button>
              );
            });
          })()}

          {recent.length > 0 && (
            <>
              <div className="s-slide-in" style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2.4, color: "#9a9aa8", textTransform: "uppercase", padding: "18px 10px 8px", animationDelay: ".5s" }}>RECENT</div>
              {recent.map((r, i) => (
                <button
                  key={r}
                  title={r}
                  onClick={() => submit(r)}
                  className="s-side-item s-slide-in"
                  style={{ ...itemStyle, color: "#c8c8d0", fontSize: 14, fontWeight: 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", animationDelay: `${0.55 + i * 0.04}s` }}
                >
                  ↺  {r}
                </button>
              ))}
            </>
          )}
        </aside>
      )}

      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          title="Show sidebar"
          aria-label="Show sidebar"
          style={{
            position: "fixed", top: 14, left: 14,
            background: "rgba(12,12,14,0.7)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#ddd", width: 32, height: 32, borderRadius: 8, cursor: "pointer", zIndex: 10,
          }}
        >
          ⟩
        </button>
      )}

      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
          padding: 24,
          position: "relative",
          zIndex: 1,
        }}
      >
      <div style={{ textAlign: "center" }}>
        <h1
          className="s-title"
          style={{
            fontSize: "clamp(44px, 6vw, 72px)",
            fontWeight: 200,
            letterSpacing: 12,
            lineHeight: 1.05,
            background: "linear-gradient(180deg, #ffffff 0%, #9bb6d4 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            margin: "0 0 18px",
            textShadow: "0 0 80px rgba(30,109,191,.35)",
          }}
        >
          SENTIENT — Map ideas, tensions, and synthesis
        </h1>
        <div className="s-sub s-fade-in" style={{ fontSize: 16, letterSpacing: 3, color: "#7a7a88", animationDelay: ".25s" }}>
          ASK A QUESTION · WE'LL MAP THE THINKING
        </div>
      </div>

      <div
        className="s-fade-up s-form"
        style={{
          width: "min(720px, 92vw)",
          position: "relative",
          borderRadius: 22,
          padding: 1,
          background:
            "linear-gradient(135deg, rgba(30,109,191,.55), rgba(122,59,214,.35) 45%, rgba(255,255,255,.06) 100%)",
          boxShadow:
            "0 30px 80px rgba(0,0,0,.55), 0 0 80px rgba(30,109,191,.12), inset 0 1px 0 rgba(255,255,255,.05)",
          animationDelay: ".15s",
        }}
      >
        <div
          style={{
            background:
              "linear-gradient(180deg, rgba(14,16,22,.85) 0%, rgba(10,11,15,.9) 100%)",
            backdropFilter: "blur(24px) saturate(1.6)",
            WebkitBackdropFilter: "blur(24px) saturate(1.6)",
            borderRadius: 21,
            padding: 18,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div style={{ position: "relative" }}>
            <textarea
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              rows={3}
              autoFocus
              placeholder="What should we map? e.g. 'The future of work in an AI-first economy'"
              className="s-input"
              style={{
                width: "100%",
                resize: "none",
                background: "transparent",
                color: "#fff",
                border: "none",
                borderRadius: 12,
                padding: "6px 4px 8px",
                fontSize: 18,
                lineHeight: "28px",
                outline: "none",
                fontFamily: "inherit",
              }}
            />
            <div
              style={{
                height: 1,
                background:
                  "linear-gradient(90deg, transparent, rgba(255,255,255,.12) 20%, rgba(255,255,255,.12) 80%, transparent)",
              }}
            />
          </div>
          {attachments.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {attachments.map((a, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 999, padding: "4px 10px", fontSize: 12, color: "#cfcfd6" }}>
                  <span style={{ opacity: .7 }}>{a.kind === "image" ? "🖼" : a.kind === "camera" ? "📷" : "📎"}</span>
                  <span style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</span>
                  <button aria-label={`Remove attachment ${a.name}`} onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))} style={{ background: "transparent", border: "none", color: "#888", cursor: "pointer", fontSize: 14, lineHeight: 1 }}>×</button>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative" }} data-plus-menu>
              <button
                onClick={() => setPlusOpen((v) => !v)}
                title="Add attachment"
                aria-label="Add attachment"
                style={{
                  width: 38, height: 38, borderRadius: 12,
                  background: plusOpen ? "rgba(30,109,191,.18)" : "rgba(255,255,255,.05)",
                  border: "1px solid rgba(255,255,255,.12)",
                  color: "#eaeaf0", cursor: "pointer", fontSize: 22, lineHeight: 1,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "transform .2s ease, background .2s ease",
                  transform: plusOpen ? "rotate(45deg)" : "rotate(0)",
                }}
              >
                +
              </button>
              {plusOpen && (
                <div
                  className="s-fade-up"
                  style={{
                    position: "absolute", bottom: "calc(100% + 10px)", left: 0,
                    minWidth: 220,
                    background: "rgba(18,18,22,.96)",
                    backdropFilter: "blur(20px) saturate(1.4)",
                    WebkitBackdropFilter: "blur(20px) saturate(1.4)",
                    border: "1px solid rgba(255,255,255,.1)",
                    borderRadius: 14,
                    padding: 6,
                    boxShadow: "0 20px 50px rgba(0,0,0,.55)",
                    zIndex: 20,
                    display: "flex", flexDirection: "column", gap: 2,
                  }}
                >
                  {[
                    { icon: "🖼", label: "Upload photo", onClick: () => pickFile("image/*", "image") },
                    { icon: "📷", label: "Take a photo", onClick: () => pickFile("image/*", "camera") },
                    { icon: "📎", label: "Upload file", onClick: () => pickFile("*/*", "file") },
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      onClick={opt.onClick}
                      className="s-side-item"
                      style={{
                        display: "flex", alignItems: "center", gap: 12,
                        background: "transparent", border: "none",
                        color: "#e8e8ec", padding: "10px 12px",
                        borderRadius: 10, fontSize: 14, cursor: "pointer",
                        textAlign: "left", width: "100%",
                      }}
                    >
                      <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>{opt.icon}</span>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              )}
              <div style={{ fontSize: 11, color: "#6a6a78", letterSpacing: 1, display: "flex", alignItems: "center", gap: 8 }}>
                <kbd
                  style={{
                    background: "rgba(255,255,255,.06)",
                    border: "1px solid rgba(255,255,255,.1)",
                    borderRadius: 6,
                    padding: "2px 6px",
                    fontSize: 10,
                    fontFamily: "inherit",
                    color: "#aaa",
                  }}
                >
                  ↵ Enter
                </kbd>
                <span>to map</span>
              </div>
            </div>
            <button
              onClick={() => submit()}
              disabled={!q.trim()}
              className="s-cta"
              style={{
                background: "linear-gradient(135deg, #1e6dbf 0%, #3a8ad9 50%, #7a3bd6 100%)",
                color: "#fff",
                border: "none",
                borderRadius: 12,
                height: 42,
                padding: "0 20px",
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: .3,
                cursor: q.trim() ? "pointer" : "not-allowed",
                opacity: q.trim() ? 1 : 0.45,
                boxShadow: "0 10px 30px rgba(30,109,191,.4)",
              }}
            >
              Build the Map  →
            </button>
          </div>
        </div>
      </div>

      <div className="s-fade-up" style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", maxWidth: 720, animationDelay: ".25s" }}>
        {[
          "Build plan for a SaaS launch",
          "Marketing strategy for an indie app",
          "Architecture for a realtime chat app",
          "Roadmap to learn machine learning",
        ].map((p, idx) => (
          <button
            key={p}
            onClick={() => navigate({ to: "/canvas", search: { q: p } })}
            className="s-chip"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#bbb",
              padding: "6px 14px",
              borderRadius: 999,
              fontSize: 12,
              cursor: "pointer",
              animation: `sentient-fade-up .4s ease-out ${0.3 + idx * 0.05}s both`,
            }}
          >
            {p}
          </button>
        ))}
      </div>
      </div>
      <GuideWizard open={guideOpen} onClose={() => setGuideOpen(false)} />
    </div>
  );
}
