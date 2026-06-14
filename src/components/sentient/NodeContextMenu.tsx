import type { NodeColor, NodeStatus } from "./nodes";

const STATUS_OPTIONS: { id: NodeStatus; label: string; color: string }[] = [
  { id: "todo", label: "Todo", color: "#cbd5e1" },
  { id: "doing", label: "Doing", color: "#fbbf24" },
  { id: "done", label: "Done", color: "#34d399" },
];

export type AssigneeOption = { email: string; label?: string };

export type NodeMenuState = {
  nodeId: string;
  x: number;
  y: number;
};

const COLORS: { id: NodeColor; label: string; swatch: string }[] = [
  { id: "default", label: "Default", swatch: "#52525b" },
  { id: "primary", label: "Blue", swatch: "#3b82f6" },
  { id: "accent", label: "Purple", swatch: "#a855f7" },
  { id: "success", label: "Green", swatch: "#10b981" },
  { id: "warn", label: "Amber", swatch: "#f59e0b" },
  { id: "mute", label: "Muted", swatch: "#71717a" },
];

export type ThinkMode = "summarize" | "critique" | "brainstorm" | "devil";

const THINK_MODES: { id: ThinkMode; label: string; icon: string; color: string }[] = [
  { id: "summarize", label: "Summarize", icon: "✦", color: "#60a5fa" },
  { id: "critique", label: "Critique", icon: "⚡", color: "#f472b6" },
  { id: "brainstorm", label: "Brainstorm", icon: "✺", color: "#fbbf24" },
  { id: "devil", label: "Devil's advocate", icon: "♛", color: "#34d399" },
];

export function NodeContextMenu({
  state,
  onClose,
  onExpand,
  onThink,
  onColor,
  onTag,
  onDelete,
  onStatus,
  onAssign,
  status,
  assignee,
  assignees,
  expanding,
}: {
  state: NodeMenuState;
  onClose: () => void;
  onExpand: (id: string) => void;
  onThink: (id: string, mode: ThinkMode) => void;
  onColor: (id: string, c: NodeColor) => void;
  onTag: (id: string) => void;
  onDelete: (id: string) => void;
  onStatus: (id: string, s: NodeStatus | undefined) => void;
  onAssign: (id: string, email: string | undefined) => void;
  status?: NodeStatus;
  assignee?: string;
  assignees: AssigneeOption[];
  expanding: boolean;
}) {
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 49 }} />
      <div
        className="glass"
        style={{
          position: "fixed",
          top: state.y,
          left: state.x,
          minWidth: 200,
          padding: 6,
          borderRadius: 10,
          zIndex: 50,
        }}
      >
        <button
          onClick={() => {
            onExpand(state.nodeId);
            onClose();
          }}
          disabled={expanding}
          style={menuItemStyle}
        >
          {expanding ? "Expanding…" : "✦ Expand with AI (3 children)"}
        </button>
        <button
          onClick={() => {
            onTag(state.nodeId);
            onClose();
          }}
          style={menuItemStyle}
        >
          # Add tag…
        </button>
        <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "4px 2px" }} />
        <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "4px 2px" }} />
        <div style={{ padding: "4px 10px", color: "#888", fontSize: 10, letterSpacing: 1 }}>
          THINKING MODES
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, padding: "4px 8px 6px" }}>
          {THINK_MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => { onThink(state.nodeId, m.id); onClose(); }}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 7,
                padding: "6px 8px",
                color: "#ddd",
                fontSize: 11.5,
                cursor: "pointer",
                textAlign: "left",
                transition: "background .15s, border-color .15s, transform .1s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = `${m.color}18`;
                e.currentTarget.style.borderColor = `${m.color}55`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
              }}
            >
              <span style={{ color: m.color, fontSize: 13 }}>{m.icon}</span>
              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.label}</span>
            </button>
          ))}
        </div>
        <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "4px 2px" }} />
        <div
          style={{
            padding: "4px 10px",
            color: "#888",
            fontSize: 10,
            letterSpacing: 1,
          }}
        >
          COLOR
        </div>
        <div style={{ display: "flex", gap: 6, padding: "4px 10px 6px" }}>
          {COLORS.map((c) => (
            <button
              key={c.id}
              title={c.label}
              onClick={() => {
                onColor(state.nodeId, c.id);
                onClose();
              }}
              style={{
                width: 18,
                height: 18,
                borderRadius: 6,
                border: "1px solid rgba(255,255,255,0.15)",
                background: c.swatch,
                cursor: "pointer",
                padding: 0,
              }}
            />
          ))}
        </div>
        <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "4px 2px" }} />
        <div style={{ padding: "4px 10px", color: "#888", fontSize: 10, letterSpacing: 1 }}>STATUS</div>
        <div style={{ display: "flex", gap: 4, padding: "4px 10px 6px" }}>
          <button
            onClick={() => { onStatus(state.nodeId, undefined); onClose(); }}
            style={{
              ...statusBtnStyle,
              opacity: status ? 0.55 : 1,
              borderColor: !status ? "#fff5" : "rgba(255,255,255,0.15)",
            }}
          >—</button>
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => { onStatus(state.nodeId, s.id); onClose(); }}
              style={{
                ...statusBtnStyle,
                color: s.color,
                borderColor: status === s.id ? s.color : "rgba(255,255,255,0.15)",
                background: status === s.id ? `${s.color}22` : "transparent",
                fontWeight: status === s.id ? 700 : 500,
              }}
            >{s.label}</button>
          ))}
        </div>
        <div style={{ padding: "4px 10px", color: "#888", fontSize: 10, letterSpacing: 1 }}>ASSIGN</div>
        <div style={{ padding: "0 10px 8px" }}>
          <select
            value={assignee ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              onAssign(state.nodeId, v || undefined);
              onClose();
            }}
            style={{
              width: "100%",
              background: "rgba(0,0,0,0.4)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#ddd",
              borderRadius: 6,
              padding: "6px 8px",
              fontSize: 12,
              outline: "none",
            }}
          >
            <option value="">— Unassigned —</option>
            {assignees.map((a) => (
              <option key={a.email} value={a.email}>{a.label || a.email}</option>
            ))}
          </select>
        </div>
        <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "4px 2px" }} />
        <button
          onClick={() => {
            onDelete(state.nodeId);
            onClose();
          }}
          style={{ ...menuItemStyle, color: "#ef4444" }}
        >
          ✕ Delete node
        </button>
      </div>
    </>
  );
}

const menuItemStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "left",
  background: "transparent",
  border: "none",
  color: "#ddd",
  padding: "8px 10px",
  borderRadius: 6,
  fontSize: 13,
  cursor: "pointer",
};

const statusBtnStyle: React.CSSProperties = {
  flex: 1,
  background: "transparent",
  border: "1px solid rgba(255,255,255,0.15)",
  color: "#ddd",
  borderRadius: 6,
  padding: "5px 4px",
  fontSize: 10,
  letterSpacing: 0.5,
  cursor: "pointer",
};
