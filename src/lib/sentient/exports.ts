import { toJpeg, toPng, toSvg } from "html-to-image";
import { jsPDF } from "jspdf";
import type { Edge, Node } from "reactflow";

const download = (filename: string, href: string) => {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
};

const canvasEl = () =>
  document.querySelector(".sentient-canvas .react-flow") as HTMLElement | null;

type NData = { label?: string; content?: string; tags?: string[] };

const typeLabel = (n: Node) => (n.type ?? "").replace("Node", "") || "node";

export const exportPng = async () => {
  const el = canvasEl();
  if (!el) return;
  const dataUrl = await toPng(el, { backgroundColor: "#080808", pixelRatio: 2 });
  download("sentient-map.png", dataUrl);
};

export const exportJpeg = async () => {
  const el = canvasEl();
  if (!el) return;
  const dataUrl = await toJpeg(el, { backgroundColor: "#080808", pixelRatio: 2, quality: 0.92 });
  download("sentient-map.jpg", dataUrl);
};

export const exportSvg = async () => {
  const el = canvasEl();
  if (!el) return;
  const dataUrl = await toSvg(el, { backgroundColor: "#080808" });
  download("sentient-map.svg", dataUrl);
};

export const exportPdf = async () => {
  const el = canvasEl();
  if (!el) return;
  const dataUrl = await toPng(el, { backgroundColor: "#080808", pixelRatio: 2 });
  const img = new Image();
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej(new Error("image load failed"));
    img.src = dataUrl;
  });
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const orientation = w >= h ? "landscape" : "portrait";
  const pdf = new jsPDF({ orientation, unit: "px", format: [w, h] });
  pdf.addImage(dataUrl, "PNG", 0, 0, w, h);
  pdf.save("sentient-map.pdf");
};

export const exportJson = (question: string, nodes: Node[], edges: Edge[]) => {
  const blob = new Blob(
    [JSON.stringify({ question, nodes, edges, exportedAt: Date.now() }, null, 2)],
    { type: "application/json" },
  );
  download("sentient-map.json", URL.createObjectURL(blob));
};

export const exportMarkdown = (question: string, nodes: Node[], edges: Edge[]) => {
  const sections: Record<string, Node[]> = {
    Concepts: nodes.filter((n) => n.type === "conceptNode"),
    Evidence: nodes.filter((n) => n.type === "evidenceNode"),
    Tensions: nodes.filter((n) => n.type === "tensionNode"),
    Synthesis: nodes.filter((n) => n.type === "synthesisNode"),
    Notes: nodes.filter((n) => n.type === "noteNode" || n.type === "stickyNode"),
  };
  const lines: string[] = [`# SENTIENT — ${question || "Map"}`, ""];
  for (const [title, list] of Object.entries(sections)) {
    if (!list.length) continue;
    lines.push(`## ${title}`, "");
    for (const n of list) {
      const d = n.data as NData;
      lines.push(`- **${d.label ?? n.id}** — ${d.content ?? ""}`);
    }
    lines.push("");
  }
  if (edges.length) {
    lines.push(`## Connections`, "");
    for (const e of edges) lines.push(`- ${e.source} → ${e.target}`);
  }
  const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
  download("sentient-map.md", URL.createObjectURL(blob));
};

export const exportTxtOutline = (question: string, nodes: Node[], edges: Edge[]) => {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const childMap = new Map<string, string[]>();
  for (const e of edges) {
    if (!childMap.has(e.source)) childMap.set(e.source, []);
    childMap.get(e.source)!.push(e.target);
  }
  const targets = new Set(edges.map((e) => e.target));
  const roots = nodes.filter((n) => !targets.has(n.id));
  const lines: string[] = [`SENTIENT — ${question || "Map"}`, "=".repeat(48), ""];
  const seen = new Set<string>();
  const walk = (id: string, depth: number) => {
    if (seen.has(id)) return;
    seen.add(id);
    const n = byId.get(id);
    if (!n) return;
    const d = n.data as NData;
    const pad = "  ".repeat(depth);
    lines.push(`${pad}• [${typeLabel(n)}] ${d.label ?? id}`);
    if (d.content) lines.push(`${pad}    ${d.content}`);
    for (const c of childMap.get(id) ?? []) walk(c, depth + 1);
  };
  for (const r of roots) walk(r.id, 0);
  for (const n of nodes) walk(n.id, 0);
  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  download("sentient-map.txt", URL.createObjectURL(blob));
};

export const exportCsv = (nodes: Node[]) => {
  const esc = (s: string) => `"${(s ?? "").replace(/"/g, '""')}"`;
  const lines = ["id,type,label,content,tags,x,y"];
  for (const n of nodes) {
    const d = n.data as NData;
    lines.push(
      [
        esc(n.id),
        esc(typeLabel(n)),
        esc(d.label ?? ""),
        esc(d.content ?? ""),
        esc((d.tags ?? []).join("|")),
        Math.round(n.position.x),
        Math.round(n.position.y),
      ].join(","),
    );
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  download("sentient-nodes.csv", URL.createObjectURL(blob));
};

export const exportMermaid = (question: string, nodes: Node[], edges: Edge[]) => {
  const safe = (s: string) => (s || "").replace(/[`"\n]/g, " ").slice(0, 80);
  const sid = (id: string) => "n_" + id.replace(/[^A-Za-z0-9_]/g, "_");
  const lines: string[] = [`%% ${question || "SENTIENT map"}`, "flowchart LR"];
  for (const n of nodes) {
    const d = n.data as NData;
    const t = typeLabel(n);
    const label = `${t.toUpperCase()}: ${safe(d.label ?? n.id)}`;
    const open = t === "tension" ? "{{" : t === "synthesis" ? "([" : t === "evidence" ? "[" : "(";
    const close = t === "tension" ? "}}" : t === "synthesis" ? "])" : t === "evidence" ? "]" : ")";
    lines.push(`  ${sid(n.id)}${open}"${label}"${close}`);
  }
  for (const e of edges) lines.push(`  ${sid(e.source)} --> ${sid(e.target)}`);
  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  download("sentient-map.mmd", URL.createObjectURL(blob));
};

export const exportHtml = async (question: string, nodes: Node[], edges: Edge[]) => {
  const el = canvasEl();
  let img = "";
  if (el) {
    try {
      img = await toPng(el, { backgroundColor: "#080808", pixelRatio: 2 });
    } catch {
      /* ignore */
    }
  }
  const esc = (s: string) =>
    (s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  const sectionFor = (title: string, list: Node[]) =>
    list.length
      ? `<section><h2>${esc(title)}</h2><ul>${list
          .map((n) => {
            const d = n.data as NData;
            return `<li><strong>${esc(d.label ?? n.id)}</strong>${
              d.content ? ` — ${esc(d.content)}` : ""
            }</li>`;
          })
          .join("")}</ul></section>`
      : "";
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>SENTIENT — ${esc(
    question || "Map",
  )}</title><style>
  :root{color-scheme:dark}
  body{margin:0;background:#0a0a0c;color:#e7e7ea;font-family:ui-sans-serif,system-ui,sans-serif;padding:32px;max-width:960px;margin:0 auto}
  h1{font-weight:600;letter-spacing:1px}
  h2{margin-top:32px;color:#9aa;font-size:13px;letter-spacing:2px;text-transform:uppercase}
  ul{padding-left:20px;line-height:1.6}
  img{width:100%;border:1px solid #222;border-radius:12px;margin:20px 0}
  </style></head><body>
  <h1>SENTIENT — ${esc(question || "Map")}</h1>
  ${img ? `<img alt="Graphical representation of the SENTIENT reasoning map" src="${img}"/>` : ""}
  ${sectionFor("Concepts", nodes.filter((n) => n.type === "conceptNode"))}
  ${sectionFor("Tensions", nodes.filter((n) => n.type === "tensionNode"))}
  ${sectionFor("Evidence", nodes.filter((n) => n.type === "evidenceNode"))}
  ${sectionFor("Synthesis", nodes.filter((n) => n.type === "synthesisNode"))}
  ${sectionFor("Notes", nodes.filter((n) => n.type === "noteNode" || n.type === "stickyNode"))}
  <p style="color:#555;font-size:11px;margin-top:40px">Exported ${new Date().toLocaleString()} · ${nodes.length} nodes · ${edges.length} edges</p>
  </body></html>`;
  const blob = new Blob([html], { type: "text/html" });
  download("sentient-map.html", URL.createObjectURL(blob));
};

export const copyToClipboard = async (question: string, nodes: Node[], edges: Edge[]) => {
  const sections: Record<string, Node[]> = {
    Concepts: nodes.filter((n) => n.type === "conceptNode"),
    Tensions: nodes.filter((n) => n.type === "tensionNode"),
    Evidence: nodes.filter((n) => n.type === "evidenceNode"),
    Synthesis: nodes.filter((n) => n.type === "synthesisNode"),
    Notes: nodes.filter((n) => n.type === "noteNode" || n.type === "stickyNode"),
  };
  const lines: string[] = [`# ${question || "SENTIENT Map"}`, ""];
  for (const [title, list] of Object.entries(sections)) {
    if (!list.length) continue;
    lines.push(`## ${title}`);
    for (const n of list) {
      const d = n.data as NData;
      lines.push(`- ${d.label ?? n.id}${d.content ? ` — ${d.content}` : ""}`);
    }
    lines.push("");
  }
  if (edges.length) {
    lines.push("## Connections");
    for (const e of edges) lines.push(`- ${e.source} → ${e.target}`);
  }
  await navigator.clipboard.writeText(lines.join("\n"));
};
