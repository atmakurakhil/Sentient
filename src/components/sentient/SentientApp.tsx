import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  addEdge,
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlowProvider,
  SelectionMode,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type DefaultEdgeOptions,
  type NodeChange,
} from "reactflow";
import "reactflow/dist/style.css";
import { nodeTypes, type SentientNodeData, type NodeColor } from "./nodes";
import { NodeContextMenu, type NodeMenuState } from "./NodeContextMenu";
import { DrawingLayer, type DrawTool, type Stroke } from "./DrawingLayer";
import { SettingsDrawer } from "./SettingsDrawer";
import { McpDrawer } from "./McpDrawer";
import { AccountSection } from "./AccountSection";
import { MemoryDrawer } from "./MemoryDrawer";
import { ShareDrawer } from "./ShareDrawer";
import {
  loadMaps,
  loadMcp,
  loadSettings,
  saveMaps,
  saveMcp,
  saveSettings,
  type SavedMap,
  type SentientSettings,
  MCP_CATALOG,
} from "@/lib/sentient/storage";
import {
  copyToClipboard,
  exportCsv,
  exportHtml,
  exportJpeg,
  exportJson,
  exportMarkdown,
  exportMermaid,
  exportPdf,
  exportPng,
  exportSvg,
  exportTxtOutline,
} from "@/lib/sentient/exports";
import { speak } from "@/lib/sentient/voice";
import { VoiceMode } from "./VoiceMode";
import { CopilotKit, useCopilotReadable, useCopilotAction } from "@copilotkit/react-core";
import { CopilotSidebar } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";
import { NodeDetailDrawer } from "./NodeDetailDrawer";
import { TextEditDrawer } from "./TextEditDrawer";

type ChatMessage = { role: "user" | "agent"; content: string };

type StreamNode = {
  id: string;
  type: "concept" | "tension" | "evidence" | "synthesis";
  label: string;
  content?: string;
  connects_to?: string[];
  image?: string;
};

const defaultEdgeOptions: DefaultEdgeOptions = {
  type: "smoothstep",
  animated: false,
  style: { stroke: "#444", strokeWidth: 1.25 },
  markerEnd: { type: MarkerType.ArrowClosed, color: "#444" },
};

function getPosition(index: number, type: string) {
  if (type === "synthesis") return { x: 280, y: 480 };
  const col = index % 3;
  const row = Math.floor(index / 3);
  return { x: col * 270 + 50, y: row * 190 + 60 };
}

const globalCss = `
  @keyframes sentientPulse { 0%,100% { opacity: 1 } 50% { opacity: 0.5 } }
  .sentient-pulse { animation: sentientPulse 1.4s ease-in-out infinite; }
  .glass {
    background: rgba(14,14,18,0.92);
    border: 1px solid rgba(255,255,255,0.06);
  }
  .glass-soft {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.06);
  }
  .icon-btn {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    color: #ddd;
    width: 32px; height: 32px;
    border-radius: 8px;
    display: inline-flex; align-items: center; justify-content: center;
    cursor: pointer;
    font-size: 14px;
    transition: background .12s, color .12s;
  }
  .icon-btn:hover { background: rgba(255,255,255,0.09); color: #fff; }
  .icon-btn.active { background: var(--accent); border-color: var(--accent); color: #fff; }
  .pill-btn {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    color: #ddd;
    height: 32px; padding: 0 12px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 12px;
    transition: background .12s;
  }
  .pill-btn:hover { background: rgba(255,255,255,0.09); }
  .menu {
    position: absolute; top: calc(100% + 6px); right: 0;
    min-width: 180px;
    border-radius: 10px;
    padding: 6px;
    z-index: 30;
  }
  .menu button {
    display: block; width: 100%; text-align: left;
    background: transparent; border: none; color: #ddd;
    padding: 8px 10px; border-radius: 6px;
    font-size: 13px; cursor: pointer;
  }
  .menu button:hover { background: rgba(255,255,255,0.06); }
  .react-flow__edge-path { transition: none !important; stroke-linecap: round; }
  .react-flow__edge.selected .react-flow__edge-path,
  .react-flow__edge:focus .react-flow__edge-path { stroke: var(--accent) !important; stroke-width: 2 !important; }
  .react-flow__edge:hover .react-flow__edge-path { stroke: var(--accent) !important; }
  .react-flow__handle { transition: transform .12s, background .12s; }
  .react-flow__handle:hover { transform: scale(1.6); }
  .react-flow__node { transition: filter .15s; }
  .react-flow__node:hover { filter: brightness(1.08); }
  .react-flow__node.selected { filter: drop-shadow(0 0 12px var(--accent)); }
  .react-flow__controls { box-shadow: 0 6px 24px rgba(0,0,0,0.4) !important; border-radius: 10px !important; overflow: hidden; border: 1px solid rgba(255,255,255,0.08) !important; }
  .react-flow__controls-button { background: rgba(20,20,24,0.95) !important; border-bottom: 1px solid rgba(255,255,255,0.06) !important; color: #ddd !important; }
  .react-flow__controls-button:hover { background: rgba(40,40,48,0.95) !important; }
  .react-flow__controls-button svg { fill: #ddd !important; }
  .react-flow__minimap { border-radius: 10px !important; border: 1px solid rgba(255,255,255,0.08) !important; box-shadow: 0 6px 24px rgba(0,0,0,0.4) !important; background: rgba(14,14,18,0.92) !important; }
  .react-flow__attribution { display: none; }
  .react-flow__selection { background: var(--accent) !important; opacity: 0.08 !important; border: 1px solid var(--accent) !important; }
  .tb-group { display: flex; gap: 4px; align-items: center; }
  .tb-divider { width: 1px; height: 22px; background: rgba(255,255,255,0.1); margin: 0 4px; }
  .tb-label { font-size: 9px; letter-spacing: 1.5px; color: #666; padding: 0 6px; text-transform: uppercase; }
  .kbd { font-size: 9px; padding: 1px 4px; border: 1px solid rgba(255,255,255,0.15); border-radius: 3px; color: #888; margin-left: 4px; font-family: ui-monospace, monospace; }
`;

function SidebarSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 6 }}>
      <h2 style={{ fontSize: 10, letterSpacing: 2, color: "#888", padding: "10px 8px 4px", margin: 0, fontWeight: 600, textTransform: "uppercase" }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

function SidebarItem({
  children,
  onClick,
  active,
  accent,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  accent?: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        textAlign: "left",
        background: active && accent ? `linear-gradient(135deg, ${accent}, ${accent}cc)` : "transparent",
        border: "1px solid transparent",
        color: active ? "#fff" : "#ddd",
        padding: "8px 10px",
        borderRadius: 8,
        fontSize: 13,
        cursor: "pointer",
        fontWeight: active ? 600 : 400,
        transition: "background .15s",
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.05)";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = "transparent";
      }}
    >
      {children}
    </button>
  );
}

type InitialOpen = "memory" | "mcp" | "settings" | "voice" | "share";

function SentientInner({
  initialQuestion,
  initialOpen,
  initialMapId,
  initialToken,
}: {
  initialQuestion?: string;
  initialOpen?: InitialOpen;
  initialMapId?: string;
  initialToken?: string;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState<SentientNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge["data"]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isBuilding, setIsBuilding] = useState(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [drawTool, setDrawTool] = useState<DrawTool>(null);
  const drawingActive = drawTool !== null;

  // Clarifying questions step (shown before building the map for max context).
  type ClarifyQ = { q: string; placeholder?: string };
  const [clarify, setClarify] = useState<{
    pending: string;
    questions: ClarifyQ[];
    answers: string[];
    loading: boolean;
  } | null>(null);

  const [settings, setSettings] = useState<SentientSettings>(loadSettings);
  const [mcp, setMcp] = useState<Record<string, boolean>>(loadMcp);
  const [maps, setMaps] = useState<SavedMap[]>(loadMaps);

  const [openSettings, setOpenSettings] = useState(false);
  const [openMcp, setOpenMcp] = useState(false);
  const [openMemory, setOpenMemory] = useState(false);
  const [openExport, setOpenExport] = useState(false);
  const [openSymbols, setOpenSymbols] = useState(false);
  const [openShare, setOpenShare] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [aiOpen, setAiOpen] = useState(false);

  const [mapId, setMapId] = useState<string | null>(initialMapId ?? null);
  const [collaborators, setCollaborators] = useState<{ email: string; label?: string }[]>([]);

  const nodeCountRef = useRef(0);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastQuestionRef = useRef("");
  const rf = useReactFlow();

  // Persist
  useEffect(() => saveSettings(settings), [settings]);
  useEffect(() => saveMcp(mcp), [mcp]);
  useEffect(() => saveMaps(maps), [maps]);

  const [ctxMenu, setCtxMenu] = useState<NodeMenuState | null>(null);
  const [expandingId, setExpandingId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<{ id: string; type: string; label: string; content?: string } | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Allow removes (context menu delete uses this).
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => onNodesChange(changes),
    [onNodesChange],
  );

  const updateNode = useCallback(
    (id: string, patch: Partial<SentientNodeData>) => {
      setNodes((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, data: { ...(n.data as SentientNodeData), ...patch } } : n,
        ),
      );
    },
    [setNodes],
  );

  const deleteNode = useCallback(
    (id: string) => {
      setNodes((prev) => prev.filter((n) => n.id !== id));
      setEdges((prev) => prev.filter((e) => e.source !== id && e.target !== id));
    },
    [setNodes, setEdges],
  );

  const colorNode = useCallback(
    (id: string, color: NodeColor) => updateNode(id, { color }),
    [updateNode],
  );

  const tagNode = useCallback(
    (id: string) => {
      const tag = window.prompt("Tag (single word):")?.trim();
      if (!tag) return;
      setNodes((prev) =>
        prev.map((n) => {
          if (n.id !== id) return n;
          const data = n.data as SentientNodeData;
          const tags = Array.from(new Set([...(data.tags ?? []), tag]));
          return { ...n, data: { ...data, tags } };
        }),
      );
    },
    [setNodes],
  );

  const handleConnect = useCallback(
    (conn: Connection) => {
      setEdges((prev) =>
        addEdge(
          {
            ...conn,
            type: "smoothstep",
            animated: false,
            style: { stroke: settings.accent + "aa", strokeWidth: 1.5 },
          },
          prev,
        ),
      );
    },
    [setEdges, settings.accent],
  );

  // Auto-resize textarea
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const max = 20 * 4 + 16;
    ta.style.height = Math.min(ta.scrollHeight, max) + "px";
  }, [input]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isBuilding]);

  useEffect(() => {
    if (nodes.length > 0) rf.fitView({ padding: 0.2, duration: 250 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes.length === 0]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const wrap = canvasWrapRef.current;
      const center = () => {
        const r = wrap?.getBoundingClientRect();
        return rf.project({ x: (r?.width ?? 800) / 2, y: (r?.height ?? 600) / 2 });
      };
      const k = e.key.toLowerCase();
      if (k === "n") { addManualNode("concept", center()); e.preventDefault(); }
      else if (k === "s") { addManualNode("sticky", center()); e.preventDefault(); }
      else if (k === "t") { addManualNode("text", center()); e.preventDefault(); }
      else if (k === "p") { setDrawTool((v) => (v === "pen" ? null : "pen")); e.preventDefault(); }
      else if (k === "e") { setDrawTool((v) => (v === "eraser" ? null : "eraser")); e.preventDefault(); }
      else if (k === "f") { rf.fitView({ padding: 0.2, duration: 250 }); e.preventDefault(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rf]);

  const enabledMcp = useMemo(
    () => MCP_CATALOG.filter((c) => mcp[c.id]).map((c) => c.name),
    [mcp],
  );

  // ---- CopilotKit integration (sponsor) ----
  const copilotNodes = useMemo(
    () =>
      nodes.map((n) => ({
        id: n.id,
        type: (n.type || "").replace("Node", ""),
        label: (n.data as SentientNodeData)?.label,
        content: (n.data as SentientNodeData)?.content,
      })),
    [nodes],
  );
  const copilotEdges = useMemo(
    () => edges.map((e) => ({ source: e.source, target: e.target })),
    [edges],
  );
  useCopilotReadable({
    description: "The current question the user asked SENTIENT to reason about.",
    value: lastQuestionRef.current || "(no question yet)",
  });
  useCopilotReadable({
    description:
      "All reasoning nodes currently on the SENTIENT canvas. Each node has id, type, label and content.",
    value: copilotNodes,
  });
  useCopilotReadable({
    description: "Edges between reasoning nodes (source -> target).",
    value: copilotEdges,
  });
  useCopilotReadable({
    description: "MCP connectors the user has enabled.",
    value: enabledMcp,
  });

  useCopilotAction({
    name: "addReasoningNode",
    description:
      "Add a new reasoning node to the SENTIENT canvas. Use this when the user wants to extend the map with a new concept, tension, evidence, or synthesis.",
    parameters: [
      { name: "id", type: "string", description: "Unique node id, e.g. 'c-extra1'", required: true },
      {
        name: "type",
        type: "string",
        description: "One of: concept | tension | evidence | synthesis",
        required: true,
      },
      { name: "label", type: "string", description: "Short label, max 4 words", required: true },
      { name: "content", type: "string", description: "1-2 sentence explanation", required: false },
      {
        name: "connects_to",
        type: "string[]",
        description: "Existing node ids to draw edges from",
        required: false,
      },
    ],
    handler: ({ id, type, label, content, connects_to }) => {
      const t = (["concept", "tension", "evidence", "synthesis"].includes(type)
        ? type
        : "concept") as StreamNode["type"];
      addNode({ id, type: t, label, content, connects_to: connects_to ?? [] });
      return `Added ${t} node "${label}" to the canvas.`;
    },
  });

  useCopilotAction({
    name: "clearCanvas",
    description: "Clear all nodes, edges and drawings from the SENTIENT canvas.",
    parameters: [],
    handler: () => {
      setNodes([]);
      setEdges([]);
      setStrokes([]);
      nodeCountRef.current = 0;
      return "Canvas cleared.";
    },
  });

  const generateNodeImage = useCallback(
    async (nodeId: string, prompt: string, label: string, content?: string) => {
      try {
        const r = await fetch("/api/node/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, node: { label, content }, model: settings.model }),
        });
        if (!r.ok) throw new Error(String(r.status));
        const { dataUrl } = (await r.json()) as { dataUrl?: string };
        if (!dataUrl) throw new Error("no image");
        setNodes((prev) =>
          prev.map((n) =>
            n.id === nodeId
              ? { ...n, data: { ...(n.data as SentientNodeData), imageUrl: dataUrl, imageLoading: false, imagePrompt: undefined } }
              : n,
          ),
        );
      } catch {
        setNodes((prev) =>
          prev.map((n) =>
            n.id === nodeId
              ? { ...n, data: { ...(n.data as SentientNodeData), imageLoading: false, imagePrompt: undefined } }
              : n,
          ),
        );
      }
    },
    [setNodes, settings.model],
  );

  const addNode = useCallback(
    ({ id, type, label, content, connects_to, image }: StreamNode) => {
      const index = nodeCountRef.current;
      nodeCountRef.current += 1;
      const position = getPosition(index, type);
      const wantsImage = typeof image === "string" && image.trim().length > 0;
      setNodes((prev) => [
        ...prev,
        {
          id,
          type: type + "Node",
          position,
          data: {
            label,
            content,
            ...(wantsImage ? { imagePrompt: image, imageLoading: true } : {}),
          },
        } as Node<SentientNodeData>,
      ]);
      setEdges((prev) => [
        ...prev,
        ...((connects_to || []).map((sourceId) => ({
          id: sourceId + "-" + id,
          source: sourceId,
          target: id,
          type: "smoothstep",
          animated: false,
          style: { stroke: settings.accent + "aa", strokeWidth: 1.5 },
        })) as Edge[]),
      ]);
      if (wantsImage) {
        void generateNodeImage(id, image!.trim(), label, content);
      }
    },
    [setNodes, setEdges, settings.accent, generateNodeImage],
  );

  const addManualNode = useCallback(
    (
      type: "concept" | "tension" | "evidence" | "synthesis" | "note" | "text" | "sticky" | "symbol",
      position: { x: number; y: number },
      extra?: { symbol?: string },
    ) => {
      const id = `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      nodeCountRef.current += 1;
      setNodes((prev) => [
        ...prev,
        {
          id,
          type: type + "Node",
          position,
          data:
            type === "text"
              ? { label: "Text", content: "" }
              : type === "sticky"
                ? { label: "New note", sticky: "yellow" }
                : type === "symbol"
                  ? { label: extra?.symbol ?? "✦", symbol: extra?.symbol ?? "✦" }
                  : { label: "New " + type, content: "" },
        } as Node<SentientNodeData>,
      ]);
    },
    [setNodes],
  );

  const expandNode = useCallback(
    async (id: string) => {
      const parent = nodes.find((n) => n.id === id);
      if (!parent) return;
      setExpandingId(id);
      try {
        const res = await fetch("/api/expand", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            parent: {
              id: parent.id,
              type: (parent.type || "concept").replace("Node", ""),
              label: (parent.data as SentientNodeData).label,
              content: (parent.data as SentientNodeData).content,
            },
            question: lastQuestionRef.current,
            context: nodes.map((n) => ({
              type: (n.type || "").replace("Node", ""),
              label: (n.data as SentientNodeData).label,
            })),
            model: settings.model,
          }),
        });
        if (!res.ok) throw new Error(`Expand failed: ${res.status}`);
        const { children } = (await res.json()) as {
          children: { id: string; type: string; label: string; content?: string; image?: string }[];
        };
        const px = parent.position.x;
        const py = parent.position.y;
        const radius = 240;
        children.forEach((child, i) => {
          const angle = (-Math.PI / 4) + (i * Math.PI) / 4;
          const pos = { x: px + Math.cos(angle) * radius + 260, y: py + Math.sin(angle) * radius };
          const childId = `${parent.id}-${child.id}-${Date.now().toString(36)}`;
          const wantsImage = typeof child.image === "string" && child.image.trim().length > 0;
          setNodes((prev) => [
            ...prev,
            {
              id: childId,
              type: child.type + "Node",
              position: pos,
              data: {
                label: child.label,
                content: child.content,
                ...(wantsImage ? { imagePrompt: child.image, imageLoading: true } : {}),
              },
            } as Node<SentientNodeData>,
          ]);
          setEdges((prev) => [
            ...prev,
            {
              id: `${parent.id}-${childId}`,
              source: parent.id,
              target: childId,
              type: "smoothstep",
              animated: false,
              style: { stroke: settings.accent + "aa", strokeWidth: 1.5 },
            } as Edge,
          ]);
          if (wantsImage) {
            void generateNodeImage(childId, child.image!.trim(), child.label, child.content);
          }
        });
      } catch (err) {
        console.error(err);
        setMessages((m) => [...m, { role: "agent", content: "Couldn't expand that node." }]);
      } finally {
        setExpandingId(null);
      }
    },
    [nodes, setNodes, setEdges, settings.accent, settings.model, generateNodeImage],
  );

  const thinkOnNode = useCallback(
    async (id: string, mode: "summarize" | "critique" | "brainstorm" | "devil") => {
      const parent = nodes.find((n) => n.id === id);
      if (!parent) return;
      const tmpId = `${id}-think-${Date.now().toString(36)}`;
      const stickyColors: Record<string, "yellow" | "pink" | "blue" | "green"> = {
        summarize: "blue",
        critique: "pink",
        brainstorm: "yellow",
        devil: "green",
      };
      const angle = Math.random() * Math.PI * 2;
      const pos = {
        x: parent.position.x + Math.cos(angle) * 280 + 240,
        y: parent.position.y + Math.sin(angle) * 200,
      };
      setNodes((prev) => [
        ...prev,
        {
          id: tmpId,
          type: "stickyNode",
          position: pos,
          data: { label: "Thinking…", content: "", sticky: stickyColors[mode] },
        } as Node<SentientNodeData>,
      ]);
      setEdges((prev) => [
        ...prev,
        {
          id: `${parent.id}-${tmpId}`,
          source: parent.id,
          target: tmpId,
          type: "smoothstep",
          animated: true,
          style: { stroke: settings.accent + "aa", strokeWidth: 1.5, strokeDasharray: "4 4" },
        } as Edge,
      ]);
      try {
        const res = await fetch("/api/think", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            parent: {
              label: (parent.data as SentientNodeData).label,
              content: (parent.data as SentientNodeData).content,
              type: (parent.type || "concept").replace("Node", ""),
            },
            mode,
            question: lastQuestionRef.current,
            model: settings.model,
          }),
        });
        if (!res.ok) throw new Error(`Think failed: ${res.status}`);
        const { label, content } = (await res.json()) as { label: string; content: string };
        setNodes((prev) =>
          prev.map((n) =>
            n.id === tmpId
              ? { ...n, data: { ...(n.data as SentientNodeData), label, content } }
              : n,
          ),
        );
        setEdges((prev) =>
          prev.map((e) =>
            e.id === `${parent.id}-${tmpId}`
              ? { ...e, animated: false, style: { ...(e.style || {}), strokeDasharray: undefined } }
              : e,
          ),
        );
      } catch (err) {
        console.error(err);
        setNodes((prev) => prev.filter((n) => n.id !== tmpId));
        setEdges((prev) => prev.filter((e) => e.id !== `${parent.id}-${tmpId}`));
        setMessages((m) => [...m, { role: "agent", content: "Couldn't run that thinking mode." }]);
      }
    },
    [nodes, setNodes, setEdges, settings.accent, settings.model],
  );

  const [refining, setRefining] = useState(false);
  const refineSketch = useCallback(async () => {
    if (!strokes.length) return;
    setRefining(true);
    try {
      const xs = strokes.flatMap((s) => s.points.map((p) => p.x));
      const ys = strokes.flatMap((s) => s.points.map((p) => p.y));
      const minX = Math.min(...xs), minY = Math.min(...ys);
      const maxX = Math.max(...xs), maxY = Math.max(...ys);
      const w = Math.max(1, maxX - minX), h = Math.max(1, maxY - minY);
      const paths = strokes
        .map((s) => {
          if (s.points.length < 2) return "";
          const [first, ...rest] = s.points;
          const d =
            `M ${(first.x - minX).toFixed(1)} ${(first.y - minY).toFixed(1)} ` +
            rest.map((p) => `L ${(p.x - minX).toFixed(1)} ${(p.y - minY).toFixed(1)}`).join(" ");
          return `<path d="${d}" stroke="black" fill="none" stroke-width="${s.width}"/>`;
        })
        .join("");
      const svg = `<svg viewBox="0 0 ${w.toFixed(0)} ${h.toFixed(0)}" xmlns="http://www.w3.org/2000/svg">${paths}</svg>`;
      const res = await fetch("/api/sketch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: lastQuestionRef.current,
          model: settings.model,
          sketchSvg: svg,
          strokeCount: strokes.length,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as {
        summary?: string;
        nodes: { id: string; type: string; label: string; content?: string }[];
        edges: { source: string; target: string }[];
      };
      const idMap = new Map<string, string>();
      data.nodes.forEach((n, i) => {
        idMap.set(n.id, `sk-${Date.now().toString(36)}-${i}`);
      });
      data.nodes.forEach((n) => {
        addNode({
          id: idMap.get(n.id)!,
          type: n.type as StreamNode["type"],
          label: n.label,
          content: n.content,
          connects_to: data.edges
            .filter((e) => e.target === n.id && idMap.has(e.source))
            .map((e) => idMap.get(e.source)!),
        });
      });
      setStrokes([]);
      setDrawTool(null);
      if (data.summary) {
        setMessages((m) => [...m, { role: "agent", content: `Refined sketch → ${data.summary}` }]);
      }
    } catch (e) {
      setMessages((m) => [...m, { role: "agent", content: "Refine failed: " + (e as Error).message }]);
    } finally {
      setRefining(false);
    }
  }, [strokes, settings.model, addNode]);

  // Inject onUpdate into every node so EditableText can write back to state.
  const displayNodes = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        data: { ...(n.data as SentientNodeData), onUpdate: updateNode, onDelete: deleteNode },
      })),
    [nodes, updateNode, deleteNode],
  );

  const handleSend = useCallback(async (override?: string, skipClarify?: boolean) => {
    const question = (override ?? input).trim();
    if (isBuilding || !question) return;

    // Ask clarifying questions first (in columns) for maximum context.
    if (!skipClarify) {
      setInput("");
      setClarify({ pending: question, questions: [], answers: ["", "", ""], loading: true });
      try {
        const r = await fetch("/api/clarify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question, model: settings.model }),
        });
        if (!r.ok) throw new Error(String(r.status));
        const data = (await r.json()) as { questions: ClarifyQ[] };
        setClarify({
          pending: question,
          questions: data.questions,
          answers: data.questions.map(() => ""),
          loading: false,
        });
      } catch {
        // Clarifier failed → just build directly.
        setClarify(null);
        void handleSend(question, true);
      }
      return;
    }

    setNodes([]);
    setEdges([]);
    setStrokes([]);
    nodeCountRef.current = 0;
    setIsBuilding(true);
    setMessages((m) => [...m, { role: "user", content: question }]);
    setInput("");
    lastQuestionRef.current = question;

    let synthesisText = "";

    try {
      const res = await fetch("/api/sentient", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          model: settings.model,
          systemPromptOverride: settings.systemPromptOverride,
          mcpContext: enabledMcp,
        }),
      });
      if (!res.ok || !res.body) throw new Error(`Request failed: ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = "";
      let jsonBuffer = "";

      const flushJsonLines = () => {
        const lines = jsonBuffer.split("\n");
        jsonBuffer = lines.pop() ?? "";
        for (const raw of lines) {
          const line = raw.trim();
          if (!line) continue;
          try {
            const parsed = JSON.parse(line) as StreamNode;
            if (parsed && parsed.id && parsed.type && parsed.label) {
              addNode(parsed);
              if (parsed.type === "synthesis") {
                synthesisText = `${parsed.label}. ${parsed.content ?? ""}`;
              }
            }
          } catch {
            /* partial */
          }
        }
      };

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        sseBuffer += decoder.decode(value, { stream: true });
        const events = sseBuffer.split("\n");
        sseBuffer = events.pop() ?? "";
        for (const evt of events) {
          const line = evt.trimEnd();
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6);
          if (payload === "[DONE]") continue;
          try {
            const json = JSON.parse(payload);
            const delta = json?.choices?.[0]?.delta?.content ?? json?.delta?.text ?? "";
            if (delta) {
              jsonBuffer += delta;
              flushJsonLines();
            }
          } catch {
            /* non-JSON sse */
          }
        }
      }
      if (jsonBuffer.trim()) {
        jsonBuffer += "\n";
        flushJsonLines();
      }

      setMessages((m) => [...m, { role: "agent", content: "Map built." }]);
      if (synthesisText) speak(synthesisText);
    } catch (err) {
      console.error(err);
      setMessages((m) => [...m, { role: "agent", content: "Something went wrong building the map." }]);
    } finally {
      setIsBuilding(false);
    }
  }, [input, isBuilding, addNode, setNodes, setEdges, settings, enabledMcp]);

  const [chatLoading, setChatLoading] = useState(false);
  const handleChat = useCallback(async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || chatLoading || isBuilding) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }, { role: "agent", content: "" }]);
    setChatLoading(true);
    try {
      const history = messages
        .filter((m) => m.content && m.content !== "Map built.")
        .slice(-10)
        .map((m) => ({ role: (m.role === "agent" ? "assistant" : "user") as "user" | "assistant", content: m.content }));
      const res = await fetch("/api/sentient/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          question: lastQuestionRef.current,
          history,
          model: settings.model,
          nodes: nodes.map((n) => ({
            type: (n.type || "concept").replace("Node", ""),
            label: (n.data as SentientNodeData)?.label,
            content: (n.data as SentientNodeData)?.content,
          })),
          edges: edges.map((e) => ({ source: e.source, target: e.target })),
        }),
      });
      if (!res.ok || !res.body) throw new Error(String(res.status));
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let sse = "";
      let acc = "";
      let pending = "";
      let rafScheduled = false;
      const flush = () => {
        rafScheduled = false;
        if (pending === acc) return;
        pending = acc;
        setMessages((m) => {
          const copy = m.slice();
          copy[copy.length - 1] = { role: "agent", content: acc };
          return copy;
        });
      };
      const schedule = () => {
        if (rafScheduled) return;
        rafScheduled = true;
        requestAnimationFrame(flush);
      };
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        sse += decoder.decode(value, { stream: true });
        const lines = sse.split("\n");
        sse = lines.pop() ?? "";
        for (const ln of lines) {
          const s = ln.trim();
          if (!s.startsWith("data: ")) continue;
          const payload = s.slice(6);
          if (payload === "[DONE]") continue;
          try {
            const json = JSON.parse(payload);
            const delta = json?.choices?.[0]?.delta?.content ?? "";
            if (delta) {
              acc += delta;
              schedule();
            }
          } catch {
            /* skip */
          }
        }
      }
      flush();
    } catch (e) {
      setMessages((m) => {
        const copy = m.slice();
        copy[copy.length - 1] = { role: "agent", content: "Chat failed: " + (e as Error).message };
        return copy;
      });
    } finally {
      setChatLoading(false);
    }
  }, [input, chatLoading, isBuilding, messages, nodes, edges, settings.model]);

  const [openVoice, setOpenVoice] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);

  const autoRanRef = useRef(false);
  useEffect(() => {
    if (autoRanRef.current) return;
    if (initialQuestion && initialQuestion.trim()) {
      autoRanRef.current = true;
      handleSend(initialQuestion.trim());
    }
  }, [initialQuestion, handleSend]);

  const initialOpenRanRef = useRef(false);
  useEffect(() => {
    if (initialOpenRanRef.current || !initialOpen) return;
    initialOpenRanRef.current = true;
    if (initialOpen === "memory") setOpenMemory(true);
    else if (initialOpen === "mcp") setOpenMcp(true);
    else if (initialOpen === "settings") setOpenSettings(true);
    else if (initialOpen === "voice") setOpenVoice(true);
    else if (initialOpen === "share") setOpenShare(true);
  }, [initialOpen]);

  // ---- Cloud collaboration: join, load, debounced save, realtime sync ----
  const joinRanRef = useRef(false);
  useEffect(() => {
    if (joinRanRef.current || !initialMapId) return;
    joinRanRef.current = true;
    (async () => {
      try {
        if (initialToken) {
          const { joinMapByToken } = await import("@/lib/sentient/share.functions");
          await joinMapByToken({ data: { mapId: initialMapId, token: initialToken } });
        }
        const { fetchCloudMap, listCollaborators } = await import("@/lib/sentient/cloud");
        const m = await fetchCloudMap(initialMapId);
        if (!m) {
          setMessages((x) => [...x, { role: "agent", content: "Couldn't load shared map." }]);
          return;
        }
        setNodes((m.nodes as Node<SentientNodeData>[]) ?? []);
        setEdges((m.edges as Edge[]) ?? []);
        setStrokes(((m.strokes as Stroke[]) ?? []));
        nodeCountRef.current = ((m.nodes as unknown[]) ?? []).length;
        lastQuestionRef.current = m.question || "";
        setMapId(m.id);
        const cs = await listCollaborators(m.id);
        setCollaborators(cs.map((c) => ({ email: c.user_email, label: c.user_email.split("@")[0] })));
      } catch (e) {
        setMessages((x) => [...x, { role: "agent", content: "Join failed: " + (e as Error).message }]);
      }
    })();
  }, [initialMapId, initialToken, setNodes, setEdges]);

  // Refresh collaborators when share drawer is opened or mapId changes.
  useEffect(() => {
    if (!mapId) return;
    let cancel = false;
    (async () => {
      try {
        const { listCollaborators } = await import("@/lib/sentient/cloud");
        const cs = await listCollaborators(mapId);
        if (cancel) return;
        setCollaborators(cs.map((c) => ({ email: c.user_email, label: c.user_email.split("@")[0] })));
      } catch { /* ignore */ }
    })();
    return () => { cancel = true; };
  }, [mapId, openShare]);

  // Debounced auto-save when nodes/edges/strokes change and we have a mapId.
  const lastSavedRef = useRef<string>("");
  useEffect(() => {
    if (!mapId) return;
    const payload = JSON.stringify({ n: nodes, e: edges, s: strokes });
    if (payload === lastSavedRef.current) return;
    const handle = setTimeout(async () => {
      try {
        const { updateCloudMap } = await import("@/lib/sentient/cloud");
        await updateCloudMap(mapId, {
          nodes: nodes as unknown[],
          edges: edges as unknown[],
          strokes: strokes as unknown[],
        });
        lastSavedRef.current = payload;
      } catch (e) {
        console.warn("autosave failed", e);
      }
    }, 800);
    return () => clearTimeout(handle);
  }, [mapId, nodes, edges, strokes]);

  // Realtime sync: subscribe to changes from other collaborators.
  useEffect(() => {
    if (!mapId) return;
    import("@/integrations/supabase/client").then(({ supabase }) => {
      const channel = supabase
        .channel(`map:${mapId}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "saved_maps", filter: `id=eq.${mapId}` },
          (payload) => {
            const incoming = JSON.stringify({
              n: payload.new.nodes,
              e: payload.new.edges,
              s: payload.new.strokes,
            });
            // Skip our own writes
            if (incoming === lastSavedRef.current) return;
            lastSavedRef.current = incoming;
            setNodes((payload.new.nodes as Node<SentientNodeData>[]) ?? []);
            setEdges((payload.new.edges as Edge[]) ?? []);
            setStrokes(((payload.new.strokes as Stroke[]) ?? []));
          },
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "map_collaborators", filter: `map_id=eq.${mapId}` },
          async () => {
            try {
              const { listCollaborators } = await import("@/lib/sentient/cloud");
              const cs = await listCollaborators(mapId);
              setCollaborators(cs.map((c) => ({ email: c.user_email, label: c.user_email.split("@")[0] })));
            } catch { /* ignore */ }
          },
        )
        .subscribe();
      // store on element so we can clean up
      (channel as unknown as { _cleanup?: () => void })._cleanup = () => {
        supabase.removeChannel(channel);
      };
      // attach to a ref via closure
      cleanupRef.current = () => supabase.removeChannel(channel);
    });
    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [mapId, setNodes, setEdges]);

  const handleSaveMap = () => {
    if (!nodes.length) return;
    const name = lastQuestionRef.current || `Map ${maps.length + 1}`;
    const m: SavedMap = {
      id: crypto.randomUUID(),
      name,
      question: lastQuestionRef.current,
      nodes: nodes as unknown[],
      edges: edges as unknown[],
      strokes: strokes as unknown[],
      createdAt: Date.now(),
    };
    setMaps((prev) => [m, ...prev]);
  };

  const handleLoadMap = (m: SavedMap) => {
    setNodes(m.nodes as Node<SentientNodeData>[]);
    setEdges(m.edges as Edge[]);
    setStrokes((m.strokes as Stroke[]) ?? []);
    nodeCountRef.current = (m.nodes as unknown[]).length;
    lastQuestionRef.current = m.question;
    setOpenMemory(false);
    setMessages((prev) => [...prev, { role: "agent", content: `Loaded "${m.name}".` }]);
  };

  const handleDeleteMap = (id: string) => setMaps((prev) => prev.filter((m) => m.id !== id));

  // background dots color handled inline
  const accent = settings.accent;
  const compact = settings.density === "compact";
  const chatPad = compact ? 12 : 16;

  return (
    <div
      style={
        {
          height: "100vh",
          width: "100vw",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          background:
            "radial-gradient(ellipse at top left, #0a121f 0%, #060608 50%, #050505 100%)",
          color: "#e7e7ea",
          ["--accent" as string]: accent,
        } as React.CSSProperties
      }
    >
      <style>{globalCss}</style>

      {/* Top bar */}
      <header
        className="glass"
        style={{
          height: 52,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 14px",
          flexShrink: 0,
          borderLeft: "none",
          borderRight: "none",
          borderTop: "none",
          borderRadius: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            className="icon-btn"
            title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
            onClick={() => setSidebarOpen((v) => !v)}
          >
            {sidebarOpen ? "⟨" : "⟩"}
          </button>
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              background: `linear-gradient(135deg, ${accent}, ${accent}77)`,
              boxShadow: `0 0 16px ${accent}66`,
            }}
          />
          <h1 style={{ color: "#fff", fontSize: 14, fontWeight: 600, margin: 0, letterSpacing: 1.5 }}>
            SENTIENT — AI reasoning canvas
          </h1>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            className="pill-btn"
            onClick={() => setOpenShare(true)}
            title="Share & collaborate"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            👥 Share
          </button>
          <div style={{ position: "relative" }}>
            <button className="pill-btn" onClick={() => setOpenExport((v) => !v)}>
              Export ▾
            </button>
            {openExport && (
              <>
                <div
                  onClick={() => setOpenExport(false)}
                  style={{ position: "fixed", inset: 0, zIndex: 20 }}
                />
                <div className="menu glass" style={{ minWidth: 220 }}>
                  <div style={{ padding: "6px 10px", color: "#666", fontSize: 9, letterSpacing: 1.5 }}>IMAGE</div>
                  <button onClick={() => { setOpenExport(false); exportPng(); }}>🖼  PNG image</button>
                  <button onClick={() => { setOpenExport(false); exportJpeg(); }}>📷  JPEG image</button>
                  <button onClick={() => { setOpenExport(false); exportSvg(); }}>✒  SVG vector</button>
                  <button onClick={() => { setOpenExport(false); exportPdf(); }}>📄  PDF document</button>
                  <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "4px 6px" }} />
                  <div style={{ padding: "6px 10px", color: "#666", fontSize: 9, letterSpacing: 1.5 }}>TEXT</div>
                  <button onClick={() => { setOpenExport(false); exportMarkdown(lastQuestionRef.current, nodes as Node[], edges as Edge[]); }}>📝  Markdown notes</button>
                  <button onClick={() => { setOpenExport(false); exportTxtOutline(lastQuestionRef.current, nodes as Node[], edges as Edge[]); }}>📃  Plain text outline</button>
                  <button onClick={() => { setOpenExport(false); exportHtml(lastQuestionRef.current, nodes as Node[], edges as Edge[]); }}>🌐  HTML page</button>
                  <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "4px 6px" }} />
                  <div style={{ padding: "6px 10px", color: "#666", fontSize: 9, letterSpacing: 1.5 }}>DATA</div>
                  <button onClick={() => { setOpenExport(false); exportJson(lastQuestionRef.current, nodes as Node[], edges as Edge[]); }}>{"{ }"}  JSON data</button>
                  <button onClick={() => { setOpenExport(false); exportCsv(nodes as Node[]); }}>📊  CSV (nodes)</button>
                  <button onClick={() => { setOpenExport(false); exportMermaid(lastQuestionRef.current, nodes as Node[], edges as Edge[]); }}>🧩  Mermaid diagram</button>
                  <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "4px 6px" }} />
                  <button
                    onClick={async () => {
                      setOpenExport(false);
                      try {
                        await copyToClipboard(lastQuestionRef.current, nodes as Node[], edges as Edge[]);
                        setMessages((m) => [...m, { role: "agent", content: "Copied map outline to clipboard." }]);
                      } catch {
                        setMessages((m) => [...m, { role: "agent", content: "Couldn't copy to clipboard." }]);
                      }
                    }}
                  >📋  Copy as Markdown</button>
                  <button
                    onClick={() => {
                      setOpenExport(false);
                      window.print();
                    }}
                  >🖨  Print…</button>
                </div>
              </>
            )}
          </div>
          <button
            className="icon-btn"
            title={chatOpen ? "Hide chat" : "Show chat"}
            onClick={() => setChatOpen((v) => !v)}
          >
            {chatOpen ? "⟩" : "⟨"}
          </button>
        </div>
      </header>

      {/* Body */}
      <div style={{ flex: 1, display: "flex", minHeight: 0, position: "relative" }}>
        {sidebarOpen && (
          <aside
            className="glass"
            style={{
              width: 240,
              minWidth: 240,
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 4,
              borderRadius: 0,
              borderTop: "none",
              borderBottom: "none",
              borderLeft: "none",
              overflowY: "auto",
            }}
          >
            <SidebarSection title="WORKSPACE">
              <SidebarItem onClick={() => { window.location.href = "/"; }}>⌂  Home</SidebarItem>
              <SidebarItem onClick={() => setOpenMemory(true)}>◫  Memory / Saved maps</SidebarItem>
              <SidebarItem onClick={() => setOpenMcp(true)}>◇  MCP connectors</SidebarItem>
              <SidebarItem onClick={() => setOpenVoice(true)}>◉  Voice mode</SidebarItem>
              <SidebarItem onClick={() => setOpenSettings(true)}>⚙  Settings</SidebarItem>
            </SidebarSection>

            <SidebarSection title="AI">
              <SidebarItem active={aiOpen} accent={accent} onClick={() => setAiOpen((v) => !v)}>
                ✦  {aiOpen ? "Hide AI Copilot" : "Open AI Copilot"}
              </SidebarItem>
            </SidebarSection>

            <AccountSection accent={accent} />
          </aside>
        )}
        <main style={{ flex: 1, minWidth: 0, height: "100%", position: "relative" }}>

          <div
            ref={canvasWrapRef}
            className="sentient-canvas"
            style={{ width: "100%", height: "100%", position: "relative" }}
            onDoubleClick={(e) => {
              if (drawingActive) return;
              const target = e.target as HTMLElement;
              // Only trigger when clicking the empty pane, not nodes/handles/inputs.
              if (!target.classList.contains("react-flow__pane")) return;
              const wrap = canvasWrapRef.current;
              const r = wrap?.getBoundingClientRect();
              const pos = rf.project({
                x: e.clientX - (r?.left ?? 0),
                y: e.clientY - (r?.top ?? 0),
              });
              addManualNode("concept", pos);
            }}
          >
            <ReactFlow
              nodes={displayNodes}
              edges={edges as Edge[]}
              onNodesChange={handleNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={handleConnect}
              onNodeContextMenu={(e, node) => {
                e.preventDefault();
                setCtxMenu({ nodeId: node.id, x: e.clientX, y: e.clientY });
              }}
              onNodeClick={(_e, node) => {
                const d = node.data as SentientNodeData;
                if (node.type === "textNode") {
                  setEditingTextId(node.id);
                  return;
                }
                if (node.type === "stickyNode") return;
                setSelectedNode({
                  id: node.id,
                  type: (node.type || "concept").replace("Node", ""),
                  label: d?.label ?? "Node",
                  content: d?.content,
                });
              }}
              onPaneClick={() => setCtxMenu(null)}
              nodeTypes={nodeTypes}
              defaultEdgeOptions={defaultEdgeOptions}
              connectionLineStyle={{ stroke: accent, strokeWidth: 2, strokeDasharray: "6 4" }}
              connectionRadius={28}
              snapToGrid
              snapGrid={[12, 12]}
              selectionMode={SelectionMode.Partial}
              selectionOnDrag
              panOnDrag={drawingActive ? false : [1, 2]}
              panOnScroll
              zoomOnScroll={!drawingActive}
              zoomOnPinch={!drawingActive}
              nodesDraggable={!drawingActive}
              nodesConnectable={!drawingActive}
              multiSelectionKeyCode={["Meta", "Shift"]}
              deleteKeyCode={["Delete", "Backspace"]}
              minZoom={0.2}
              maxZoom={2.5}
              fitView
              proOptions={{ hideAttribution: true }}
            >
              <Background variant={BackgroundVariant.Dots} gap={18} size={1.2} color="#2a2a32" />
              <Controls position="bottom-left" showInteractive={false} />
              <MiniMap
                position="bottom-right"
                pannable
                zoomable
                maskColor="rgba(0,0,0,0.55)"
                nodeColor={(n) => {
                  const t = n.type || "";
                  if (t === "stickyNode") return "#fde68a";
                  if (t === "tensionNode") return "#bf1e1e";
                  if (t === "synthesisNode") return "#c49a00";
                  if (t === "evidenceNode") return "#666";
                  if (t === "textNode") return "#888";
                  return accent;
                }}
                nodeStrokeWidth={2}
                style={{ width: 180, height: 120 }}
              />
            </ReactFlow>

            <DrawingLayer
              active={drawingActive}
              tool={drawTool}
              color={accent}
              strokes={strokes}
              setStrokes={setStrokes}
            />

            {/* Top floating toolbar */}
            <div
              className="glass"
              style={{
                position: "absolute",
                top: 16,
                left: "50%",
                transform: "translateX(-50%)",
                borderRadius: 14,
                padding: "8px 10px",
                display: "flex",
                gap: 6,
                alignItems: "center",
                zIndex: 10,
                boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
              }}
            >
              <span className="tb-label">Add</span>
              <div className="tb-group">
                <button
                  className="icon-btn"
                  title="Add concept node (N)"
                  onClick={() => {
                    const wrap = canvasWrapRef.current;
                    if (!wrap) return;
                    const r = wrap.getBoundingClientRect();
                    const pos = rf.project({ x: r.width / 2, y: r.height / 2 });
                    addManualNode("concept", pos);
                  }}
                >
                  ＋
                </button>
                <button
                  className="icon-btn"
                  title="Add sticky note (S)"
                  onClick={() => {
                    const wrap = canvasWrapRef.current;
                    if (!wrap) return;
                    const r = wrap.getBoundingClientRect();
                    const pos = rf.project({
                      x: r.width / 2 + (Math.random() - 0.5) * 80,
                      y: r.height / 2 + (Math.random() - 0.5) * 80,
                    });
                    addManualNode("sticky", pos);
                  }}
                  style={{ fontSize: 16 }}
                >
                  🗒
                </button>
                <button
                  className="icon-btn"
                  title="Add text (T)"
                  onClick={() => {
                    const wrap = canvasWrapRef.current;
                    if (!wrap) return;
                    const r = wrap.getBoundingClientRect();
                    const pos = rf.project({ x: r.width / 2, y: r.height / 2 });
                    addManualNode("text", pos);
                  }}
                  style={{ fontFamily: "serif", fontSize: 15, fontWeight: 600 }}
                >
                  T
                </button>
              </div>

              <div className="tb-divider" />
              <span className="tb-label">Symbols</span>
              <div className="tb-group" style={{ position: "relative" }}>
                <button
                  className={`icon-btn ${openSymbols ? "active" : ""}`}
                  title="Insert symbol"
                  onClick={() => setOpenSymbols((v) => !v)}
                  style={{ fontSize: 16 }}
                >
                  ✦
                </button>
                {openSymbols && (
                  <>
                    <div
                      onClick={() => setOpenSymbols(false)}
                      style={{ position: "fixed", inset: 0, zIndex: 20 }}
                    />
                    <div
                      className="menu glass"
                      style={{
                        position: "absolute",
                        top: 38,
                        left: 0,
                        zIndex: 30,
                        width: 280,
                        padding: 10,
                      }}
                    >
                      {[
                        { title: "Arrows", items: ["→", "←", "↑", "↓", "↔", "⇒", "⇐", "↻", "↺", "↗", "↘", "⤴"] },
                        { title: "Shapes", items: ["●", "○", "■", "□", "▲", "△", "◆", "◇", "★", "☆", "♥", "✚"] },
                        { title: "Status", items: ["✓", "✗", "✦", "⚠", "❗", "❓", "💡", "🔥", "⭐", "🎯", "🚀", "🧠"] },
                        { title: "Faces", items: ["😀", "🤔", "😎", "😍", "😡", "😱", "🥳", "🙏", "👍", "👎", "👀", "💪"] },
                      ].map((g) => (
                        <div key={g.title} style={{ marginBottom: 8 }}>
                          <div style={{ fontSize: 9, color: "#666", letterSpacing: 1.5, padding: "2px 4px 4px" }}>
                            {g.title.toUpperCase()}
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4 }}>
                            {g.items.map((s) => (
                              <button
                                key={s}
                                title={s}
                                onClick={() => {
                                  const wrap = canvasWrapRef.current;
                                  if (!wrap) return;
                                  const r = wrap.getBoundingClientRect();
                                  const pos = rf.project({
                                    x: r.width / 2 + (Math.random() - 0.5) * 120,
                                    y: r.height / 2 + (Math.random() - 0.5) * 120,
                                  });
                                  addManualNode("symbol", pos, { symbol: s });
                                  setOpenSymbols(false);
                                }}
                                style={{
                                  background: "rgba(255,255,255,0.04)",
                                  border: "1px solid rgba(255,255,255,0.06)",
                                  borderRadius: 6,
                                  padding: "6px 0",
                                  fontSize: 18,
                                  cursor: "pointer",
                                  color: "#fff",
                                  lineHeight: 1,
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="tb-divider" />
              <span className="tb-label">Draw</span>
              <div className="tb-group">
                <button
                  className={`icon-btn ${drawTool === "pen" ? "active" : ""}`}
                  title="Pen (P)"
                  onClick={() => setDrawTool(drawTool === "pen" ? null : "pen")}
                >
                  ✎
                </button>
                <button
                  className={`icon-btn ${drawTool === "eraser" ? "active" : ""}`}
                  title="Eraser (E)"
                  onClick={() => setDrawTool(drawTool === "eraser" ? null : "eraser")}
                >
                  ⌫
                </button>
                <button
                  className="icon-btn"
                  title="Clear drawings"
                  onClick={() => setStrokes([])}
                  disabled={!strokes.length}
                >
                  ✕
                </button>
              </div>

              <div className="tb-divider" />
              <span className="tb-label">View</span>
              <div className="tb-group">
                <button
                  className="icon-btn"
                  title="Fit view (F)"
                  onClick={() => rf.fitView({ padding: 0.2, duration: 300 })}
                >
                  ⤢
                </button>
                <button
                  className="icon-btn"
                  title="Zoom in"
                  onClick={() => rf.zoomIn({ duration: 200 })}
                >
                  ＋
                </button>
                <button
                  className="icon-btn"
                  title="Zoom out"
                  onClick={() => rf.zoomOut({ duration: 200 })}
                >
                  −
                </button>
              </div>

              <div className="tb-divider" />
              <button
                className={"pill-btn " + (refining ? "sentient-pulse" : "")}
                title="Ask AI to turn this sketch into structured nodes"
                onClick={refineSketch}
                disabled={!strokes.length || refining}
                style={{
                  background: strokes.length ? `linear-gradient(135deg, ${accent}, ${accent}cc)` : undefined,
                  color: strokes.length ? "#fff" : undefined,
                  border: strokes.length ? "none" : undefined,
                  fontWeight: 600,
                }}
              >
                {refining ? "Refining…" : "✨ Refine"}
              </button>
            </div>

            {ctxMenu && (() => {
              const menuNode = nodes.find((n) => n.id === ctxMenu.nodeId);
              const menuData = menuNode?.data as SentientNodeData | undefined;
              return (
                <NodeContextMenu
                  state={ctxMenu}
                  onClose={() => setCtxMenu(null)}
                  onExpand={expandNode}
                  onThink={thinkOnNode}
                  onColor={colorNode}
                  onTag={tagNode}
                  onDelete={deleteNode}
                  onStatus={(id, s) => updateNode(id, { status: s })}
                  onAssign={(id, email) => {
                    const c = collaborators.find((x) => x.email === email);
                    updateNode(id, { assignee: email, assigneeName: c?.label || email });
                  }}
                  status={menuData?.status}
                  assignee={menuData?.assignee}
                  assignees={collaborators}
                  expanding={expandingId === ctxMenu.nodeId}
                />
              );
            })()}

            {nodes.length === 0 && !isBuilding && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  pointerEvents: "none",
                }}
              >
                <div style={{ textAlign: "center", color: "#3a3a42" }}>
                  <div style={{ fontSize: 36, fontWeight: 200, letterSpacing: 8, marginBottom: 8 }}>
                    SENTIENT
                  </div>
                  <div style={{ fontSize: 12, letterSpacing: 2, opacity: 0.7 }}>
                    ASK A QUESTION · DOUBLE-CLICK TO ADD · DRAG HANDLES TO CONNECT
                  </div>
                </div>
              </div>
            )}

            {clarify && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(5,5,8,0.78)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 20,
                  padding: 24,
                }}
              >
                <div
                  className="glass"
                  style={{
                    width: "min(900px, 100%)",
                    borderRadius: 16,
                    padding: 24,
                    boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
                  }}
                >
                  <div style={{ fontSize: 11, letterSpacing: 2, color: accent, marginBottom: 6 }}>
                    CLARIFY · MAX CONTEXT
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: "#fff", marginBottom: 4 }}>
                    A few quick questions before I map this
                  </div>
                  <div style={{ fontSize: 12, color: "#888", marginBottom: 18, fontStyle: "italic" }}>
                    "{clarify.pending}"
                  </div>

                  {clarify.loading ? (
                    <div className="sentient-pulse" style={{ color: "#888", fontSize: 13, padding: "20px 0" }}>
                      Thinking of the right questions…
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: `repeat(${clarify.questions.length}, minmax(0, 1fr))`,
                        gap: 12,
                        marginBottom: 16,
                      }}
                    >
                      {clarify.questions.map((q, i) => (
                        <div
                          key={i}
                          style={{
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid rgba(255,255,255,0.07)",
                            borderRadius: 12,
                            padding: 14,
                            display: "flex",
                            flexDirection: "column",
                            gap: 8,
                          }}
                        >
                          <div style={{ fontSize: 10, color: accent, letterSpacing: 1.5 }}>
                            Q{i + 1}
                          </div>
                          <div style={{ fontSize: 13, color: "#eee", lineHeight: 1.4, minHeight: 38 }}>
                            {q.q}
                          </div>
                          <textarea
                            value={clarify.answers[i] ?? ""}
                            onChange={(e) =>
                              setClarify((c) =>
                                c
                                  ? {
                                      ...c,
                                      answers: c.answers.map((a, j) => (j === i ? e.target.value : a)),
                                    }
                                  : c,
                              )
                            }
                            placeholder={q.placeholder || "Your answer…"}
                            rows={3}
                            style={{
                              resize: "none",
                              background: "rgba(0,0,0,0.4)",
                              color: "#fff",
                              border: "1px solid rgba(255,255,255,0.08)",
                              borderRadius: 8,
                              padding: "8px 10px",
                              fontSize: 12,
                              outline: "none",
                              fontFamily: "inherit",
                              lineHeight: 1.4,
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button
                      className="pill-btn"
                      onClick={() => {
                        const q = clarify.pending;
                        setClarify(null);
                        void handleSend(q, true);
                      }}
                    >
                      Skip · build now
                    </button>
                    <button
                      disabled={clarify.loading}
                      onClick={() => {
                        const filled = clarify.questions
                          .map((q, i) => {
                            const a = (clarify.answers[i] || "").trim();
                            return a ? `- ${q.q} ${a}` : "";
                          })
                          .filter(Boolean)
                          .join("\n");
                        const enriched = filled
                          ? `${clarify.pending}\n\nAdditional context:\n${filled}`
                          : clarify.pending;
                        setClarify(null);
                        void handleSend(enriched, true);
                      }}
                      style={{
                        background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
                        color: "#fff",
                        border: "none",
                        borderRadius: 8,
                        height: 36,
                        padding: "0 18px",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: clarify.loading ? "not-allowed" : "pointer",
                        opacity: clarify.loading ? 0.55 : 1,
                        boxShadow: `0 8px 24px ${accent}44`,
                      }}
                    >
                      Build with context →
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Chat */}
        {chatOpen && (
        <aside
          className="glass"
          style={{
            width: 360,
            minWidth: 360,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            borderTop: "none",
            borderRight: "none",
            borderBottom: "none",
            borderRadius: 0,
          }}
        >
          <div
            ref={scrollRef}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: chatPad,
              display: "flex",
              flexDirection: "column",
              gap: compact ? 8 : 10,
            }}
          >
            {messages.length === 0 && !isBuilding && (
              <div style={{ color: "#666", fontSize: 12, fontStyle: "italic" }}>
                Ask a question. I'll map my reasoning.
              </div>
            )}
            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} style={{ display: "flex", justifyContent: "flex-end" }}>
                  <div
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      color: "#fff",
                      borderRadius: "14px 14px 4px 14px",
                      padding: "10px 14px",
                      maxWidth: "85%",
                      fontSize: 13,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {m.content}
                  </div>
                </div>
              ) : (
                <div
                  key={i}
                  style={{
                    color: "#dcdce0",
                    fontSize: 13,
                    lineHeight: 1.55,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {m.content || (chatLoading && i === messages.length - 1 ? "…" : "")}
                </div>
              ),
            )}
            {isBuilding && (
              <div className="sentient-pulse" style={{ color: "#888", fontSize: 12, fontStyle: "italic" }}>
                Thinking…
              </div>
            )}
          </div>

          {/* Enabled MCP chips */}
          {enabledMcp.length > 0 && (
            <div
              style={{
                padding: "6px 12px",
                display: "flex",
                gap: 4,
                flexWrap: "wrap",
                borderTop: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              {enabledMcp.map((n) => (
                <span
                  key={n}
                  style={{
                    fontSize: 10,
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: `${accent}22`,
                    color: accent,
                    border: `1px solid ${accent}44`,
                  }}
                >
                  {n}
                </span>
              ))}
            </div>
          )}

          <div
            style={{
              padding: 12,
              borderTop: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 2 }}>
              {[
                { l: "🛠 Build plan", t: "Make a step-by-step plan to build " },
                { l: "📣 Marketing", t: "Make a marketing plan for " },
                { l: "🏛 Architecture", t: "Design the architecture for " },
                { l: "🧭 Roadmap", t: "Outline a 90-day roadmap for " },
              ].map((p) => (
                <button
                  key={p.l}
                  className="pill-btn"
                  style={{ fontSize: 11, height: 26, padding: "0 8px" }}
                  onClick={() => {
                    setInput((v) => (v.trim() ? v : p.t));
                    taRef.current?.focus();
                  }}
                  disabled={isBuilding}
                >
                  {p.l}
                </button>
              ))}
            </div>
            <textarea
              ref={taRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (e.metaKey || e.ctrlKey) handleSend();
                  else handleChat();
                }
              }}
              rows={1}
              disabled={isBuilding}
              placeholder={nodes.length ? "Ask about the map, or ⌘↵ to build a new one…" : "What should we map?  ↵ to chat · ⌘↵ to build"}
              style={{
                width: "100%",
                resize: "none",
                background: "rgba(0,0,0,0.4)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 10,
                padding: "10px 12px",
                fontSize: 13,
                lineHeight: "20px",
                outline: "none",
                fontFamily: "inherit",
              }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => handleChat()}
                disabled={chatLoading || isBuilding || !input.trim()}
                className={chatLoading ? "sentient-pulse" : ""}
                style={{
                  flex: 1,
                  background: "rgba(255,255,255,0.06)",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 10,
                  height: 40,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: chatLoading || isBuilding || !input.trim() ? "not-allowed" : "pointer",
                  opacity: chatLoading || isBuilding || !input.trim() ? 0.55 : 1,
                }}
              >
                {chatLoading ? "Thinking…" : "💬 Chat"}
              </button>
              <button
                onClick={() => handleSend()}
                disabled={isBuilding || !input.trim()}
                className={isBuilding ? "sentient-pulse" : ""}
                title="Generate a fresh reasoning map (⌘↵)"
                style={{
                  flex: 1.2,
                  background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  height: 40,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: isBuilding || !input.trim() ? "not-allowed" : "pointer",
                  opacity: isBuilding || !input.trim() ? 0.55 : 1,
                  boxShadow: `0 8px 24px ${accent}44`,
                }}
              >
                {isBuilding ? "Thinking…" : "✦ Build map →"}
              </button>
            </div>
          </div>
        </aside>
        )}
      </div>

      <SettingsDrawer
        open={openSettings}
        onClose={() => setOpenSettings(false)}
        settings={settings}
        onChange={setSettings}
      />
      <McpDrawer
        open={openMcp}
        onClose={() => setOpenMcp(false)}
        enabled={mcp}
        onToggle={(id) => setMcp((m) => ({ ...m, [id]: !m[id] }))}
        accent={accent}
      />
      <MemoryDrawer
        open={openMemory}
        onClose={() => setOpenMemory(false)}
        maps={maps}
        accent={accent}
        onLoad={handleLoadMap}
        onDelete={handleDeleteMap}
        onSaveCurrent={handleSaveMap}
        canSave={nodes.length > 0}
      />
      <VoiceMode open={openVoice} onClose={() => setOpenVoice(false)} accent={accent} model={settings.model} />
      <ShareDrawer
        open={openShare}
        onClose={() => setOpenShare(false)}
        mapId={mapId}
        setMapId={setMapId}
        question={lastQuestionRef.current}
        nodes={nodes as unknown[]}
        edges={edges as unknown[]}
        strokes={strokes as unknown[]}
        accent={accent}
      />
      <NodeDetailDrawer
        node={selectedNode}
        onClose={() => setSelectedNode(null)}
        question={lastQuestionRef.current}
        model={settings.model}
        accent={accent}
      />
      <TextEditDrawer
        open={!!editingTextId}
        onClose={() => setEditingTextId(null)}
        data={
          editingTextId
            ? ((nodes.find((n) => n.id === editingTextId)?.data as SentientNodeData) ?? null)
            : null
        }
        onChange={(patch) => {
          if (editingTextId) updateNode(editingTextId, patch);
        }}
        onDelete={() => {
          if (!editingTextId) return;
          setNodes((prev) => prev.filter((n) => n.id !== editingTextId));
          setEditingTextId(null);
        }}
        accent={accent}
      />
      {aiOpen && (
        <CopilotSidebar
          defaultOpen
          clickOutsideToClose={false}
          onSetOpen={(o) => { if (!o) setAiOpen(false); }}
          instructions="You are SENTIENT's co-pilot. Help the user explore, extend, and refine the reasoning map currently on their canvas. Use the addReasoningNode action to add nodes and clearCanvas to reset. Be concise."
          labels={{
            title: "SENTIENT Copilot",
            initial:
              "Hi — I can read your canvas and add reasoning nodes for you. Try: 'Add a tension node about scalability' or 'Summarize the current map'.",
          }}
        />
      )}
    </div>
  );
}

export function SentientApp({
  initialQuestion,
  initialOpen,
  initialMapId,
  initialToken,
}: {
  initialQuestion?: string;
  initialOpen?: InitialOpen;
  initialMapId?: string;
  initialToken?: string;
} = {}) {
  return (
    <CopilotKit runtimeUrl="/api/copilotkit">
      <ReactFlowProvider>
        <SentientInner
          initialQuestion={initialQuestion}
          initialOpen={initialOpen}
          initialMapId={initialMapId}
          initialToken={initialToken}
        />
      </ReactFlowProvider>
    </CopilotKit>
  );
}
