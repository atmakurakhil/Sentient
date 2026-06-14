import JSZip from "jszip";

export type RoadmapStep = { id: string; title: string; detail?: string; done: boolean };
export type NodeTable = { columns: string[]; rows: string[][] };
export type NodeChatMsg = { role: "user" | "assistant"; content: string };

export type NodeWorkspace = {
  notes: string;
  doc?: string;
  roadmap: RoadmapStep[];
  imageDataUrl?: string;
  imagePrompt?: string;
  table?: NodeTable;
  diagram?: string; // mermaid source
  chat: NodeChatMsg[];
  updatedAt: number;
};

const KEY = (id: string) => `sentient.node.v1.${id}`;

const empty = (): NodeWorkspace => ({
  notes: "",
  roadmap: [],
  chat: [],
  updatedAt: Date.now(),
});

export function loadNodeWorkspace(id: string): NodeWorkspace {
  if (typeof window === "undefined") return empty();
  try {
    const raw = localStorage.getItem(KEY(id));
    if (!raw) return empty();
    return { ...empty(), ...(JSON.parse(raw) as Partial<NodeWorkspace>) };
  } catch {
    return empty();
  }
}

export function saveNodeWorkspace(id: string, ws: NodeWorkspace) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY(id), JSON.stringify({ ...ws, updatedAt: Date.now() }));
}

export function clearNodeWorkspace(id: string) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY(id));
}

function safeName(s: string) {
  return (s || "node").replace(/[^a-z0-9-_]+/gi, "_").slice(0, 60) || "node";
}

function csvEscape(v: string) {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export function tableToCsv(t: NodeTable): string {
  const head = t.columns.map(csvEscape).join(",");
  const body = t.rows.map((r) => r.map(csvEscape).join(",")).join("\n");
  return head + "\n" + body;
}

function dataUrlToBlob(dataUrl: string): Blob | null {
  const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!m) return null;
  const bin = atob(m[2]);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: m[1] });
}

function buildMarkdown(label: string, ws: NodeWorkspace) {
  const parts: string[] = [`# ${label}`];
  if (ws.doc?.trim()) parts.push(ws.doc.trim());
  if (ws.notes.trim()) parts.push("## Notes\n\n" + ws.notes.trim());
  if (ws.roadmap.length) {
    parts.push(
      "## Roadmap\n\n" +
        ws.roadmap
          .map(
            (s) =>
              `- [${s.done ? "x" : " "}] **${s.title}**` +
              (s.detail ? `\n  - ${s.detail.replace(/\n/g, " ")}` : ""),
          )
          .join("\n"),
    );
  }
  if (ws.diagram) parts.push("## Diagram (mermaid)\n\n```mermaid\n" + ws.diagram + "\n```");
  if (ws.chat.length) {
    parts.push(
      "## Chat\n\n" +
        ws.chat.map((m) => `**${m.role}:** ${m.content}`).join("\n\n"),
    );
  }
  return parts.join("\n\n") + "\n";
}

function buildHtml(label: string, ws: NodeWorkspace) {
  const md = buildMarkdown(label, ws);
  // Minimal markdown -> HTML transform good enough for sharing.
  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const lines = md.split("\n");
  const out: string[] = [];
  let inList = false;
  let inCode = false;
  let codeBuf: string[] = [];
  const flushList = () => {
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
  };
  for (const raw of lines) {
    if (raw.startsWith("```")) {
      if (inCode) {
        out.push(`<pre><code>${escape(codeBuf.join("\n"))}</code></pre>`);
        codeBuf = [];
        inCode = false;
      } else {
        flushList();
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      codeBuf.push(raw);
      continue;
    }
    const h = raw.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      flushList();
      const lvl = h[1].length;
      out.push(`<h${lvl}>${escape(h[2])}</h${lvl}>`);
      continue;
    }
    if (/^\s*[-*]\s+/.test(raw)) {
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${escape(raw.replace(/^\s*[-*]\s+/, ""))}</li>`);
      continue;
    }
    flushList();
    if (raw.trim()) out.push(`<p>${escape(raw)}</p>`);
  }
  flushList();
  if (inCode) out.push(`<pre><code>${escape(codeBuf.join("\n"))}</code></pre>`);

  return `<!doctype html><html><head><meta charset="utf-8"><title>${escape(label)}</title>
<style>
:root{color-scheme:dark light}
body{font:15px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;max-width:760px;margin:40px auto;padding:0 24px;color:#1a1a1a;background:#fafafa}
@media (prefers-color-scheme: dark){body{background:#0a0a0c;color:#e7e7ea}}
h1{font-size:28px;font-weight:700;letter-spacing:-.02em;margin:0 0 8px}
h2{font-size:18px;font-weight:600;margin-top:32px;border-bottom:1px solid #8884;padding-bottom:6px}
h3{font-size:15px;font-weight:600;margin-top:24px}
ul{padding-left:22px}
li{margin:4px 0}
pre{background:#0006;padding:14px;border-radius:8px;overflow:auto;font-size:12.5px}
blockquote{border-left:3px solid #888;color:#888;margin:12px 0;padding:4px 12px}
</style></head><body>${out.join("\n")}</body></html>`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadNodeBundle(label: string, ws: NodeWorkspace) {
  const zip = new JSZip();
  const folder = zip.folder(safeName(label)) ?? zip;
  folder.file("README.md", buildMarkdown(label, ws));
  folder.file("doc.html", buildHtml(label, ws));
  if (ws.table) folder.file("table.csv", tableToCsv(ws.table));
  if (ws.diagram) folder.file("diagram.mmd", ws.diagram);
  if (ws.imageDataUrl) {
    const blob = dataUrlToBlob(ws.imageDataUrl);
    if (blob) folder.file("image.png", blob);
  }
  const out = await zip.generateAsync({ type: "blob" });
  downloadBlob(out, safeName(label) + ".zip");
}

export function downloadDocMarkdown(label: string, ws: NodeWorkspace) {
  downloadBlob(new Blob([buildMarkdown(label, ws)], { type: "text/markdown" }), safeName(label) + ".md");
}

export function downloadDocHtml(label: string, ws: NodeWorkspace) {
  downloadBlob(new Blob([buildHtml(label, ws)], { type: "text/html" }), safeName(label) + ".html");
}

export function downloadFile(filename: string, content: string, mime: string) {
  downloadBlob(new Blob([content], { type: mime }), filename);
}

export function downloadDataUrl(filename: string, dataUrl: string) {
  const b = dataUrlToBlob(dataUrl);
  if (b) downloadBlob(b, filename);
}
