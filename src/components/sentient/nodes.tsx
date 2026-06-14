import { Handle, Position, type NodeProps } from "reactflow";
import { useEffect, useRef, useState } from "react";

export type NodeColor = "default" | "primary" | "accent" | "warn" | "success" | "mute";

export type TextAlign = "left" | "center" | "right";

export type StickyColor = "yellow" | "pink" | "blue" | "green" | "orange" | "purple";

export const STICKY_PALETTE: Record<StickyColor, { bg: string; border: string; text: string; shadow: string }> = {
  yellow: { bg: "#fde68a", border: "#f59e0b", text: "#3a2a05", shadow: "0 8px 22px rgba(245,158,11,0.35)" },
  pink:   { bg: "#fbcfe8", border: "#ec4899", text: "#3a0a23", shadow: "0 8px 22px rgba(236,72,153,0.35)" },
  blue:   { bg: "#bae6fd", border: "#0ea5e9", text: "#0a2540", shadow: "0 8px 22px rgba(14,165,233,0.35)" },
  green:  { bg: "#bbf7d0", border: "#10b981", text: "#04341c", shadow: "0 8px 22px rgba(16,185,129,0.35)" },
  orange: { bg: "#fed7aa", border: "#f97316", text: "#451a03", shadow: "0 8px 22px rgba(249,115,22,0.35)" },
  purple: { bg: "#e9d5ff", border: "#a855f7", text: "#2a0b45", shadow: "0 8px 22px rgba(168,85,247,0.35)" },
};

export type NodeStatus = "todo" | "doing" | "done";

export const STATUS_META: Record<NodeStatus, { label: string; color: string; bg: string }> = {
  todo:  { label: "TODO",  color: "#cbd5e1", bg: "rgba(148,163,184,0.18)" },
  doing: { label: "DOING", color: "#fbbf24", bg: "rgba(251,191,36,0.18)" },
  done:  { label: "DONE",  color: "#34d399", bg: "rgba(52,211,153,0.18)" },
};

export type SentientNodeData = {
  label: string;
  content?: string;
  color?: NodeColor;
  tags?: string[];
  fontSize?: number;
  align?: TextAlign;
  sticky?: StickyColor;
  symbol?: string;
  imageUrl?: string;
  imagePrompt?: string;
  imageLoading?: boolean;
  assignee?: string;       // collaborator email
  assigneeName?: string;   // display name / first letter
  status?: NodeStatus;
  onUpdate?: (id: string, patch: Partial<SentientNodeData>) => void;
  onDelete?: (id: string) => void;
};

type Variant = {
  bg: string;
  border: string;
  labelText: string;
  labelTag: string;
  accent: string;
  shadow: string;
  width: number;
};

const variants: Record<string, Variant> = {
  concept: {
    bg: "#0f1a2e",
    border: "#1e4d8c",
    labelTag: "CONCEPT",
    labelText: "#1e6dbf",
    accent: "#1e6dbf",
    shadow: "0 0 20px rgba(30,77,140,0.3)",
    width: 220,
  },
  tension: {
    bg: "#1a0f0f",
    border: "#8c1e1e",
    labelTag: "TENSION",
    labelText: "#bf1e1e",
    accent: "#bf1e1e",
    shadow: "0 0 20px rgba(140,30,30,0.3)",
    width: 220,
  },
  evidence: {
    bg: "#111111",
    border: "#444444",
    labelTag: "EVIDENCE",
    labelText: "#666666",
    accent: "#444444",
    shadow: "none",
    width: 220,
  },
  synthesis: {
    bg: "#1a1500",
    border: "#8c6d00",
    labelTag: "SYNTHESIS",
    labelText: "#c49a00",
    accent: "#c49a00",
    shadow: "0 0 30px rgba(140,109,0,0.4)",
    width: 240,
  },
  note: {
    bg: "#0f0f15",
    border: "#3a3a52",
    labelTag: "NOTE",
    labelText: "#8a8aa8",
    accent: "#6a6a92",
    shadow: "none",
    width: 220,
  },
};

const colorOverlay: Record<NodeColor, { border?: string; accent?: string; tag?: string }> = {
  default: {},
  primary: { border: "#3b82f6", accent: "#3b82f6", tag: "#3b82f6" },
  accent: { border: "#a855f7", accent: "#a855f7", tag: "#a855f7" },
  warn: { border: "#f59e0b", accent: "#f59e0b", tag: "#f59e0b" },
  success: { border: "#10b981", accent: "#10b981", tag: "#10b981" },
  mute: { border: "#52525b", accent: "#52525b", tag: "#71717a" },
};

function EditableText({
  value,
  onChange,
  multiline,
  style,
}: {
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  style?: React.CSSProperties;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  useEffect(() => setDraft(value), [value]);
  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);

  const commit = () => {
    setEditing(false);
    if (draft !== value) onChange(draft);
  };

  if (editing) {
    const common = {
      ref: ref as never,
      value: draft,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setDraft(e.target.value),
      onBlur: commit,
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && (!multiline || (e.metaKey || e.ctrlKey))) {
          e.preventDefault();
          commit();
        }
        if (e.key === "Escape") {
          setDraft(value);
          setEditing(false);
        }
      },
      onClick: (e: React.MouseEvent) => e.stopPropagation(),
      className: "nodrag",
      style: {
        ...style,
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: 4,
        outline: "none",
        width: "100%",
        fontFamily: "inherit",
        resize: "none" as const,
      },
    };
    return multiline ? <textarea {...common} rows={3} /> : <input {...common} />;
  }
  return (
    <div
      onDoubleClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
      style={{ ...style, cursor: "text" }}
      title="Double-click to edit"
    >
      {value || (multiline ? "—" : "Untitled")}
    </div>
  );
}

function DeleteBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onMouseDown={(e) => e.stopPropagation()}
      title="Delete node"
      className="nodrag s-node-del"
      style={{
        position: "absolute",
        top: -8,
        right: -8,
        width: 20,
        height: 20,
        borderRadius: "50%",
        background: "#1a1a1f",
        border: "1px solid rgba(255,255,255,0.18)",
        color: "#ef4444",
        cursor: "pointer",
        padding: 0,
        fontSize: 12,
        lineHeight: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 5,
        boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
      }}
    >
      ×
    </button>
  );
}

function BaseNode({
  id,
  data,
  kind,
}: {
  id: string;
  data: SentientNodeData;
  kind: keyof typeof variants;
}) {
  const v = variants[kind];
  const overlay = colorOverlay[data.color ?? "default"];
  const border = overlay.border ?? v.border;
  const accent = overlay.accent ?? v.accent;
  const tagColor = overlay.tag ?? v.labelText;

  const update = (patch: Partial<SentientNodeData>) => data.onUpdate?.(id, patch);

  return (
    <div
      style={{
        width: v.width,
        minHeight: 80,
        padding: 14,
        background: v.bg,
        border: `1.5px solid ${border}`,
        borderLeft: `3px solid ${accent}`,
        borderRadius: 10,
        boxShadow: v.shadow,
        position: "relative",
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: accent, border: "none", width: 10, height: 10 }}
      />
      <DeleteBtn onClick={() => data.onDelete?.(id)} />
      {(data.assignee || data.status) && (
        <div
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            display: "flex",
            alignItems: "center",
            gap: 4,
            zIndex: 1,
          }}
        >
          {data.status && (
            <span
              style={{
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: 1,
                padding: "2px 5px",
                borderRadius: 4,
                background: STATUS_META[data.status].bg,
                color: STATUS_META[data.status].color,
                border: `1px solid ${STATUS_META[data.status].color}55`,
              }}
              title={"Status: " + STATUS_META[data.status].label}
            >
              {STATUS_META[data.status].label}
            </span>
          )}
          {data.assignee && (
            <span
              title={"Assigned to " + (data.assigneeName || data.assignee)}
              style={{
                width: 18,
                height: 18,
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${accent}, ${accent}99)`,
                color: "#fff",
                fontSize: 9,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid rgba(0,0,0,0.3)",
              }}
            >
              {(data.assigneeName || data.assignee).slice(0, 1).toUpperCase()}
            </span>
          )}
        </div>
      )}
      <div
        style={{
          color: tagColor,
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: 1.5,
          marginBottom: 8,
        }}
      >
        {v.labelTag}
      </div>
      {data.imageUrl ? (
        <img
          src={data.imageUrl}
          alt={data.label}
          style={{
            width: "100%",
            height: 110,
            objectFit: "cover",
            borderRadius: 6,
            marginBottom: 8,
            border: `1px solid ${border}`,
          }}
        />
      ) : data.imageLoading || data.imagePrompt ? (
        <div
          className="sentient-pulse"
          style={{
            width: "100%",
            height: 110,
            background: `linear-gradient(135deg, ${accent}22, ${accent}05)`,
            borderRadius: 6,
            marginBottom: 8,
            border: `1px dashed ${accent}55`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: tagColor,
            fontSize: 9,
            letterSpacing: 1,
          }}
        >
          GENERATING IMAGE…
        </div>
      ) : null}
      <EditableText
        value={data.label}
        onChange={(label) => update({ label })}
        style={{ color: "#fff", fontSize: 13, fontWeight: 600, lineHeight: 1.4 }}
      />
      <EditableText
        value={data.content ?? ""}
        multiline
        onChange={(content) => update({ content })}
        style={{ color: "#8899aa", fontSize: 11, marginTop: 6, lineHeight: 1.5 }}
      />
      {data.tags && data.tags.length > 0 ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
          {data.tags.map((t) => (
            <span
              key={t}
              style={{
                fontSize: 9,
                padding: "1px 6px",
                borderRadius: 999,
                background: `${accent}22`,
                color: tagColor,
                border: `1px solid ${accent}55`,
              }}
            >
              {t}
            </span>
          ))}
        </div>
      ) : null}
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: accent, border: "none", width: 10, height: 10 }}
      />
    </div>
  );
}

export const ConceptNode = (p: NodeProps<SentientNodeData>) => (
  <BaseNode id={p.id} data={p.data} kind="concept" />
);
export const TensionNode = (p: NodeProps<SentientNodeData>) => (
  <BaseNode id={p.id} data={p.data} kind="tension" />
);
export const EvidenceNode = (p: NodeProps<SentientNodeData>) => (
  <BaseNode id={p.id} data={p.data} kind="evidence" />
);
export const SynthesisNode = (p: NodeProps<SentientNodeData>) => (
  <BaseNode id={p.id} data={p.data} kind="synthesis" />
);
export const NoteNode = (p: NodeProps<SentientNodeData>) => (
  <BaseNode id={p.id} data={p.data} kind="note" />
);

export const TextNode = (p: NodeProps<SentientNodeData>) => {
  const update = (patch: Partial<SentientNodeData>) => p.data.onUpdate?.(p.id, patch);
  return (
    <div
      style={{
        position: "relative",
        minWidth: 120,
        maxWidth: 360,
        padding: "6px 10px",
        background: "transparent",
        borderRadius: 6,
        border: p.selected ? "1px dashed rgba(255,255,255,0.35)" : "1px dashed transparent",
      }}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0, width: 6, height: 6 }} />
      <DeleteBtn onClick={() => p.data.onDelete?.(p.id)} />
      <EditableText
        value={p.data.label}
        multiline
        onChange={(label) => update({ label })}
        style={{
          color: "#e7e7ea",
          fontSize: p.data.fontSize ?? 14,
          lineHeight: 1.4,
          whiteSpace: "pre-wrap",
          textAlign: p.data.align ?? "left",
        }}
      />
      <Handle type="source" position={Position.Right} style={{ opacity: 0, width: 6, height: 6 }} />
    </div>
  );
};

const STICKY_ORDER: StickyColor[] = ["yellow", "pink", "blue", "green", "orange", "purple"];

export const StickyNode = (p: NodeProps<SentientNodeData>) => {
  const update = (patch: Partial<SentientNodeData>) => p.data.onUpdate?.(p.id, patch);
  const color: StickyColor = p.data.sticky ?? "yellow";
  const palette = STICKY_PALETTE[color];
  const cycle = () => {
    const i = STICKY_ORDER.indexOf(color);
    update({ sticky: STICKY_ORDER[(i + 1) % STICKY_ORDER.length] });
  };
  return (
    <div
      style={{
        width: 200,
        minHeight: 200,
        padding: 14,
        background: `linear-gradient(160deg, ${palette.bg} 0%, ${palette.bg} 60%, ${palette.border}33 100%)`,
        border: `1px solid ${palette.border}66`,
        borderRadius: 4,
        boxShadow: p.selected
          ? `${palette.shadow}, 0 0 0 2px ${palette.border}`
          : palette.shadow,
        position: "relative",
        transform: "rotate(-1.2deg)",
        fontFamily: "'Caveat', 'Comic Sans MS', cursive, system-ui",
      }}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0, width: 6, height: 6 }} />
      <DeleteBtn onClick={() => p.data.onDelete?.(p.id)} />
      <div
        style={{
          position: "absolute",
          top: -10,
          left: "50%",
          transform: "translateX(-50%) rotate(-3deg)",
          width: 56,
          height: 16,
          background: "rgba(255,255,255,0.55)",
          borderLeft: "1px solid rgba(0,0,0,0.05)",
          borderRight: "1px solid rgba(0,0,0,0.05)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
        }}
      />
      <button
        onClick={(e) => {
          e.stopPropagation();
          cycle();
        }}
        title="Change color"
        className="nodrag"
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          width: 14,
          height: 14,
          borderRadius: "50%",
          background: palette.border,
          border: "1px solid rgba(0,0,0,0.15)",
          cursor: "pointer",
          padding: 0,
        }}
      />
      <EditableText
        value={p.data.label}
        multiline
        onChange={(label) => update({ label })}
        style={{
          color: palette.text,
          fontSize: p.data.fontSize ?? 18,
          lineHeight: 1.3,
          whiteSpace: "pre-wrap",
          textAlign: p.data.align ?? "left",
          fontWeight: 500,
          marginTop: 8,
        }}
      />
      <Handle type="source" position={Position.Right} style={{ opacity: 0, width: 6, height: 6 }} />
    </div>
  );
};

export const SymbolNode = (p: NodeProps<SentientNodeData>) => {
  const size = p.data.fontSize ?? 56;
  return (
    <div
      style={{
        position: "relative",
        padding: 6,
        borderRadius: 10,
        border: p.selected ? "1px dashed rgba(255,255,255,0.4)" : "1px dashed transparent",
        background: "transparent",
        userSelect: "none",
        lineHeight: 1,
      }}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0, width: 6, height: 6 }} />
      <DeleteBtn onClick={() => p.data.onDelete?.(p.id)} />
      <div
        style={{
          fontSize: size,
          lineHeight: 1,
          textAlign: "center",
          filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.4))",
        }}
      >
        {p.data.symbol ?? p.data.label ?? "✦"}
      </div>
      <Handle type="source" position={Position.Right} style={{ opacity: 0, width: 6, height: 6 }} />
    </div>
  );
};

export const nodeTypes = {
  conceptNode: ConceptNode,
  tensionNode: TensionNode,
  evidenceNode: EvidenceNode,
  synthesisNode: SynthesisNode,
  noteNode: NoteNode,
  textNode: TextNode,
  stickyNode: StickyNode,
  symbolNode: SymbolNode,
};
