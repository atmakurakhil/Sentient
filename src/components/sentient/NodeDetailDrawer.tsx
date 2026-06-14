import { useEffect, useMemo, useState } from "react";
import {
  loadNodeWorkspace,
  saveNodeWorkspace,
  downloadNodeBundle,
  downloadFile,
  downloadDataUrl,
  downloadDocMarkdown,
  downloadDocHtml,
  tableToCsv,
  type NodeWorkspace,
  type RoadmapStep,
  type NodeChatMsg,
} from "@/lib/sentient/node-workspace";
import { MermaidView } from "./MermaidView";

type NodeRef = { id: string; type: string; label: string; content?: string };

type Props = {
  node: NodeRef | null;
  onClose: () => void;
  question: string;
  model: string;
  accent: string;
};

type Tab = "doc" | "notes" | "roadmap" | "artifacts" | "chat";

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export function NodeDetailDrawer({ node, onClose, question, model, accent }: Props) {
  const [tab, setTab] = useState<Tab>("doc");
  const [ws, setWs] = useState<NodeWorkspace | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [imagePrompt, setImagePrompt] = useState("");
  const [tableHint, setTableHint] = useState("");
  const [diagramEdit, setDiagramEdit] = useState("");
  const [docKind, setDocKind] = useState<"howto" | "architecture" | "build" | "marketing">("howto");

  // Load on open
  useEffect(() => {
    if (!node) {
      setWs(null);
      return;
    }
    setWs(loadNodeWorkspace(node.id));
    setTab("doc");
    setChatInput("");
    setImagePrompt("");
    setTableHint("");
    setDiagramEdit("");
  }, [node?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist on every change
  useEffect(() => {
    if (node && ws) saveNodeWorkspace(node.id, ws);
  }, [ws, node]);

  const open = !!node;
  const updateWs = (patch: Partial<NodeWorkspace>) =>
    setWs((prev) => (prev ? { ...prev, ...patch } : prev));

  const apiNode = useMemo(
    () => (node ? { label: node.label, type: node.type, content: node.content } : null),
    [node],
  );

  const generateRoadmap = async () => {
    if (!apiNode || !ws) return;
    setBusy("roadmap");
    try {
      const r = await fetch("/api/node/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ node: apiNode, question, model }),
      });
      if (!r.ok) throw new Error(await r.text());
      const data = (await r.json()) as { steps: { title: string; detail?: string }[] };
      const steps: RoadmapStep[] = data.steps.map((s) => ({
        id: uid(),
        title: s.title,
        detail: s.detail,
        done: false,
      }));
      updateWs({ roadmap: steps });
      setTab("roadmap");
    } catch (e) {
      alert("Roadmap failed: " + (e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const generateImage = async () => {
    if (!apiNode || !ws) return;
    setBusy("image");
    try {
      const r = await fetch("/api/node/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          node: apiNode,
          prompt: imagePrompt || "minimal, abstract, soft glow",
        }),
      });
      if (!r.ok) throw new Error(await r.text());
      const data = (await r.json()) as { dataUrl: string };
      updateWs({ imageDataUrl: data.dataUrl, imagePrompt });
    } catch (e) {
      alert("Image failed: " + (e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const generateTable = async () => {
    if (!apiNode || !ws) return;
    setBusy("table");
    try {
      const r = await fetch("/api/node/table", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ node: apiNode, question, model, hint: tableHint }),
      });
      if (!r.ok) throw new Error(await r.text());
      const data = (await r.json()) as { columns: string[]; rows: string[][] };
      updateWs({ table: data });
    } catch (e) {
      alert("Table failed: " + (e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const generateDiagram = async (opts?: { instruction?: string }) => {
    if (!apiNode || !ws) return;
    setBusy("diagram");
    try {
      const r = await fetch("/api/node/diagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          node: apiNode,
          question,
          model,
          current: ws.diagram,
          instruction: opts?.instruction,
        }),
      });
      if (!r.ok) throw new Error(await r.text());
      const data = (await r.json()) as { mermaid: string };
      updateWs({ diagram: data.mermaid });
      setDiagramEdit("");
    } catch (e) {
      alert("Diagram failed: " + (e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const generateDoc = async () => {
    if (!apiNode || !ws) return;
    setBusy("doc");
    try {
      const r = await fetch("/api/node/doc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          node: apiNode,
          question,
          model,
          kind: docKind,
          notes: ws.notes,
          roadmap: ws.roadmap,
        }),
      });
      if (!r.ok) throw new Error(await r.text());
      const data = (await r.json()) as { markdown: string };
      updateWs({ doc: data.markdown });
    } catch (e) {
      alert("Doc failed: " + (e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const sendChat = async () => {
    if (!apiNode || !ws) return;
    const msg = chatInput.trim();
    if (!msg) return;
    const next: NodeChatMsg[] = [...ws.chat, { role: "user", content: msg }];
    updateWs({ chat: next });
    setChatInput("");
    setBusy("chat");
    try {
      const r = await fetch("/api/node/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          node: apiNode,
          question,
          model,
          message: msg,
          history: ws.chat.slice(-6),
        }),
      });
      if (!r.ok) throw new Error(await r.text());
      const data = (await r.json()) as { reply: string };
      updateWs({ chat: [...next, { role: "assistant", content: data.reply }] });
    } catch (e) {
      updateWs({
        chat: [...next, { role: "assistant", content: "Error: " + (e as Error).message }],
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity .2s",
          zIndex: 50,
        }}
      />
      <aside
        className="glass"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          height: "100vh",
          width: 520,
          maxWidth: "100vw",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform .25s ease",
          zIndex: 51,
          display: "flex",
          flexDirection: "column",
          borderRadius: 0,
          borderTop: "none",
          borderRight: "none",
          borderBottom: "none",
        }}
      >
        {node && ws && (
          <>
            {/* Header */}
            <div
              style={{
                padding: "14px 16px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 12,
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    color: accent,
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: 1.5,
                    marginBottom: 4,
                  }}
                >
                  {(node.type || "node").toUpperCase()} · WORKSPACE
                </div>
                <div style={{ color: "#fff", fontSize: 15, fontWeight: 600, lineHeight: 1.3 }}>
                  {node.label}
                </div>
                {node.content && (
                  <div style={{ color: "#888", fontSize: 11, marginTop: 4, lineHeight: 1.4 }}>
                    {node.content}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  className="pill-btn"
                  title="Download all artifacts as .zip"
                  onClick={() => downloadNodeBundle(node.label, ws)}
                >
                  ↓ .zip
                </button>
                <button className="icon-btn" onClick={onClose} title="Close">
                  ✕
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div
              style={{
                display: "flex",
                gap: 2,
                padding: "8px 12px 0",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {(["doc", "notes", "roadmap", "artifacts", "chat"] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: tab === t ? "#fff" : "#777",
                    fontSize: 12,
                    fontWeight: tab === t ? 600 : 400,
                    padding: "8px 12px",
                    cursor: "pointer",
                    borderBottom:
                      tab === t ? `2px solid ${accent}` : "2px solid transparent",
                    textTransform: "capitalize",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
              {tab === "doc" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ color: "#888", fontSize: 11 }}>
                    AI-generated, ready-to-share document scoped to this node.
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {(["howto", "architecture", "build", "marketing"] as const).map((k) => (
                      <button
                        key={k}
                        className="pill-btn"
                        onClick={() => setDocKind(k)}
                        style={
                          docKind === k
                            ? { background: `${accent}33`, borderColor: `${accent}66`, color: "#fff" }
                            : undefined
                        }
                      >
                        {k === "howto"
                          ? "How-to"
                          : k === "architecture"
                            ? "Architecture"
                            : k === "build"
                              ? "Build plan"
                              : "Marketing"}
                      </button>
                    ))}
                    <div style={{ flex: 1 }} />
                    <button
                      className="pill-btn"
                      onClick={generateDoc}
                      disabled={busy === "doc"}
                      style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)`, color: "#fff", border: "none" }}
                    >
                      {busy === "doc" ? "Writing…" : ws.doc ? "Regenerate" : "Generate doc"}
                    </button>
                  </div>
                  {ws.doc ? (
                    <>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button className="pill-btn" onClick={() => downloadDocMarkdown(node.label, ws)}>
                          ↓ .md
                        </button>
                        <button className="pill-btn" onClick={() => downloadDocHtml(node.label, ws)}>
                          ↓ .html
                        </button>
                        <button
                          className="pill-btn"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(ws.doc || "");
                              alert("Copied to clipboard — paste into Notion, Slack, email…");
                            } catch {
                              alert("Copy failed");
                            }
                          }}
                        >
                          ⧉ Copy
                        </button>
                        <button
                          className="pill-btn"
                          onClick={() => {
                            const html = `<!doctype html><meta charset="utf-8"><title>${node.label}</title>` +
                              `<style>body{font:15px/1.6 -apple-system,Segoe UI,Roboto,sans-serif;max-width:760px;margin:40px auto;padding:0 24px}pre{background:#eee;padding:12px;border-radius:8px;overflow:auto}</style>` +
                              `<body>` +
                              `<pre style="white-space:pre-wrap">${(ws.doc || "").replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!))}</pre>`;
                            const w = window.open("", "_blank");
                            if (w) {
                              w.document.write(html);
                              w.document.close();
                              setTimeout(() => w.print(), 300);
                            }
                          }}
                        >
                          ⎙ Print / PDF
                        </button>
                      </div>
                      <textarea
                        value={ws.doc}
                        onChange={(e) => updateWs({ doc: e.target.value })}
                        style={{
                          minHeight: 420,
                          width: "100%",
                          background: "rgba(0,0,0,0.4)",
                          color: "#eee",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: 8,
                          padding: 14,
                          fontSize: 13,
                          lineHeight: 1.6,
                          fontFamily: "ui-monospace, Menlo, monospace",
                          resize: "vertical",
                          outline: "none",
                        }}
                      />
                    </>
                  ) : (
                    <div style={emptyHint}>
                      No doc yet. Pick a flavor above and click <b>Generate doc</b>.
                    </div>
                  )}
                </div>
              )}

              {tab === "notes" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, height: "100%" }}>
                  <div style={{ color: "#888", fontSize: 11 }}>
                    Free-form markdown notes for this node. Saved automatically.
                  </div>
                  <textarea
                    value={ws.notes}
                    onChange={(e) => updateWs({ notes: e.target.value })}
                    placeholder="What does completing this node actually look like?"
                    style={{
                      flex: 1,
                      minHeight: 240,
                      width: "100%",
                      background: "rgba(0,0,0,0.4)",
                      color: "#eee",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 13,
                      fontFamily: "ui-monospace, Menlo, monospace",
                      lineHeight: 1.55,
                      resize: "vertical",
                      outline: "none",
                    }}
                  />
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      className="pill-btn"
                      onClick={() =>
                        downloadFile(
                          (node.label || "notes").replace(/[^a-z0-9-_]+/gi, "_") + ".md",
                          `# ${node.label}\n\n${ws.notes}\n`,
                          "text/markdown",
                        )
                      }
                      disabled={!ws.notes.trim()}
                    >
                      ↓ Notes.md
                    </button>
                  </div>
                </div>
              )}

              {tab === "roadmap" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      className="pill-btn"
                      onClick={generateRoadmap}
                      disabled={busy === "roadmap"}
                    >
                      {busy === "roadmap" ? "Generating…" : ws.roadmap.length ? "Regenerate" : "Generate roadmap with AI"}
                    </button>
                    <button
                      className="pill-btn"
                      onClick={() =>
                        updateWs({
                          roadmap: [
                            ...ws.roadmap,
                            { id: uid(), title: "New step", done: false },
                          ],
                        })
                      }
                    >
                      + Step
                    </button>
                  </div>
                  {ws.roadmap.length === 0 && (
                    <div style={{ color: "#666", fontSize: 12, fontStyle: "italic" }}>
                      No roadmap yet. Generate one or add steps manually.
                    </div>
                  )}
                  {ws.roadmap.map((s, i) => (
                    <div
                      key={s.id}
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        borderRadius: 8,
                        padding: 10,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={s.done}
                          onChange={(e) => {
                            const next = [...ws.roadmap];
                            next[i] = { ...s, done: e.target.checked };
                            updateWs({ roadmap: next });
                          }}
                          style={{ marginTop: 4 }}
                        />
                        <div style={{ flex: 1 }}>
                          <input
                            value={s.title}
                            onChange={(e) => {
                              const next = [...ws.roadmap];
                              next[i] = { ...s, title: e.target.value };
                              updateWs({ roadmap: next });
                            }}
                            style={{
                              width: "100%",
                              background: "transparent",
                              color: s.done ? "#666" : "#fff",
                              border: "none",
                              fontSize: 13,
                              fontWeight: 600,
                              outline: "none",
                              textDecoration: s.done ? "line-through" : "none",
                            }}
                          />
                          <textarea
                            value={s.detail ?? ""}
                            onChange={(e) => {
                              const next = [...ws.roadmap];
                              next[i] = { ...s, detail: e.target.value };
                              updateWs({ roadmap: next });
                            }}
                            placeholder="Details…"
                            rows={2}
                            style={{
                              width: "100%",
                              background: "transparent",
                              color: "#999",
                              border: "none",
                              fontSize: 11,
                              marginTop: 4,
                              outline: "none",
                              resize: "vertical",
                              fontFamily: "inherit",
                            }}
                          />
                        </div>
                        <button
                          className="icon-btn"
                          onClick={() =>
                            updateWs({ roadmap: ws.roadmap.filter((x) => x.id !== s.id) })
                          }
                          title="Delete"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {tab === "artifacts" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  {/* Image */}
                  <section>
                    <div style={sectionTitle}>Image</div>
                    <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                      <input
                        value={imagePrompt}
                        onChange={(e) => setImagePrompt(e.target.value)}
                        placeholder="Style hint (e.g. blueprint, watercolor)"
                        style={inputStyle}
                      />
                      <button
                        className="pill-btn"
                        onClick={generateImage}
                        disabled={busy === "image"}
                      >
                        {busy === "image" ? "…" : "Generate"}
                      </button>
                    </div>
                    {ws.imageDataUrl ? (
                      <div>
                        <img
                          src={ws.imageDataUrl}
                          alt={node.label}
                          style={{
                            width: "100%",
                            borderRadius: 8,
                            border: "1px solid rgba(255,255,255,0.08)",
                          }}
                        />
                        <button
                          className="pill-btn"
                          style={{ marginTop: 6 }}
                          onClick={() =>
                            downloadDataUrl(
                              (node.label || "image").replace(/[^a-z0-9-_]+/gi, "_") + ".png",
                              ws.imageDataUrl!,
                            )
                          }
                        >
                          ↓ image.png
                        </button>
                      </div>
                    ) : (
                      <div style={emptyHint}>No image yet.</div>
                    )}
                  </section>

                  {/* Table */}
                  <section>
                    <div style={sectionTitle}>Table</div>
                    <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                      <input
                        value={tableHint}
                        onChange={(e) => setTableHint(e.target.value)}
                        placeholder="What should the table compare?"
                        style={inputStyle}
                      />
                      <button
                        className="pill-btn"
                        onClick={generateTable}
                        disabled={busy === "table"}
                      >
                        {busy === "table" ? "…" : "Generate"}
                      </button>
                    </div>
                    {ws.table ? (
                      <div>
                        <div
                          style={{
                            overflowX: "auto",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: 8,
                          }}
                        >
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                            <thead>
                              <tr>
                                {ws.table.columns.map((c, i) => (
                                  <th
                                    key={i}
                                    style={{
                                      textAlign: "left",
                                      padding: "8px 10px",
                                      color: accent,
                                      borderBottom: "1px solid rgba(255,255,255,0.08)",
                                      fontWeight: 600,
                                    }}
                                  >
                                    {c}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {ws.table.rows.map((r, i) => (
                                <tr key={i}>
                                  {r.map((cell, j) => (
                                    <td
                                      key={j}
                                      style={{
                                        padding: "8px 10px",
                                        color: "#ccc",
                                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                                      }}
                                    >
                                      {cell}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <button
                          className="pill-btn"
                          style={{ marginTop: 6 }}
                          onClick={() =>
                            downloadFile(
                              (node.label || "table").replace(/[^a-z0-9-_]+/gi, "_") + ".csv",
                              tableToCsv(ws.table!),
                              "text/csv",
                            )
                          }
                        >
                          ↓ table.csv
                        </button>
                      </div>
                    ) : (
                      <div style={emptyHint}>No table yet.</div>
                    )}
                  </section>

                  {/* Diagram */}
                  <section>
                    <div style={sectionTitle}>Diagram (Mermaid)</div>
                    <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                      <button
                        className="pill-btn"
                        onClick={() => generateDiagram()}
                        disabled={busy === "diagram"}
                      >
                        {busy === "diagram" ? "…" : ws.diagram ? "Regenerate" : "Generate"}
                      </button>
                      {ws.diagram && (
                        <button
                          className="pill-btn"
                          onClick={() =>
                            downloadFile(
                              (node.label || "diagram").replace(/[^a-z0-9-_]+/gi, "_") + ".mmd",
                              ws.diagram!,
                              "text/plain",
                            )
                          }
                        >
                          ↓ .mmd
                        </button>
                      )}
                    </div>
                    {ws.diagram && (
                      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                        <input
                          value={diagramEdit}
                          onChange={(e) => setDiagramEdit(e.target.value)}
                          placeholder='Edit, e.g. "add a payment service after auth"'
                          style={inputStyle}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && diagramEdit.trim()) {
                              e.preventDefault();
                              generateDiagram({ instruction: diagramEdit.trim() });
                            }
                          }}
                        />
                        <button
                          className="pill-btn"
                          onClick={() => generateDiagram({ instruction: diagramEdit.trim() })}
                          disabled={busy === "diagram" || !diagramEdit.trim()}
                        >
                          ✎ Edit
                        </button>
                      </div>
                    )}
                    {ws.diagram ? (
                      <>
                        <div
                          style={{
                            background: "rgba(0,0,0,0.4)",
                            borderRadius: 8,
                            padding: 12,
                            border: "1px solid rgba(255,255,255,0.08)",
                          }}
                        >
                          <MermaidView source={ws.diagram} />
                        </div>
                        <textarea
                          value={ws.diagram}
                          onChange={(e) => updateWs({ diagram: e.target.value })}
                          style={{
                            width: "100%",
                            marginTop: 6,
                            background: "rgba(0,0,0,0.4)",
                            color: "#aaa",
                            border: "1px solid rgba(255,255,255,0.06)",
                            borderRadius: 6,
                            padding: 8,
                            fontSize: 11,
                            fontFamily: "ui-monospace, Menlo, monospace",
                            minHeight: 80,
                            outline: "none",
                          }}
                        />
                      </>
                    ) : (
                      <div style={emptyHint}>No diagram yet.</div>
                    )}
                  </section>
                </div>
              )}

              {tab === "chat" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, height: "100%" }}>
                  <div style={{ color: "#888", fontSize: 11 }}>
                    AI chat scoped to this node. Knows its label, content & the map question.
                  </div>
                  <div
                    style={{
                      flex: 1,
                      minHeight: 200,
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      overflowY: "auto",
                      padding: 4,
                    }}
                  >
                    {ws.chat.length === 0 && (
                      <div style={{ color: "#555", fontSize: 12, fontStyle: "italic" }}>
                        Ask anything about completing this node.
                      </div>
                    )}
                    {ws.chat.map((m, i) => (
                      <div
                        key={i}
                        style={{
                          alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                          maxWidth: "88%",
                          background:
                            m.role === "user"
                              ? "rgba(255,255,255,0.06)"
                              : `${accent}11`,
                          border:
                            m.role === "user"
                              ? "1px solid rgba(255,255,255,0.06)"
                              : `1px solid ${accent}33`,
                          color: "#eee",
                          fontSize: 12.5,
                          padding: "8px 12px",
                          borderRadius:
                            m.role === "user"
                              ? "12px 12px 4px 12px"
                              : "12px 12px 12px 4px",
                          whiteSpace: "pre-wrap",
                          lineHeight: 1.5,
                        }}
                      >
                        {m.content}
                      </div>
                    ))}
                    {busy === "chat" && (
                      <div
                        className="sentient-pulse"
                        style={{ color: "#888", fontSize: 11, fontStyle: "italic" }}
                      >
                        Thinking…
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendChat();
                        }
                      }}
                      placeholder="Ask about this node…"
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    <button
                      className="pill-btn"
                      onClick={sendChat}
                      disabled={busy === "chat" || !chatInput.trim()}
                    >
                      Send
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </aside>
    </>
  );
}

const sectionTitle: React.CSSProperties = {
  color: "#aaa",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 1.5,
  marginBottom: 8,
  textTransform: "uppercase",
};

const emptyHint: React.CSSProperties = {
  color: "#555",
  fontSize: 12,
  fontStyle: "italic",
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  background: "rgba(0,0,0,0.4)",
  color: "#fff",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 8,
  padding: "8px 10px",
  fontSize: 12,
  outline: "none",
  fontFamily: "inherit",
};
