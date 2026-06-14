import { Drawer } from "./Drawer";
import type { SentientNodeData, TextAlign } from "./nodes";

type Props = {
  open: boolean;
  onClose: () => void;
  data: SentientNodeData | null;
  onChange: (patch: Partial<SentientNodeData>) => void;
  onDelete: () => void;
  accent: string;
};

const sectionLabel: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: 2,
  color: "#888",
  marginBottom: 8,
  textTransform: "uppercase",
};

export function TextEditDrawer({ open, onClose, data, onChange, onDelete, accent }: Props) {
  const fontSize = data?.fontSize ?? 14;
  const align: TextAlign = data?.align ?? "left";

  return (
    <Drawer open={open} onClose={onClose} title="Edit text" width={360}>
      {!data ? (
        <div style={{ color: "#888", fontSize: 13 }}>No text node selected.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div>
            <div style={sectionLabel}>Content</div>
            <textarea
              value={data.label}
              onChange={(e) => onChange({ label: e.target.value })}
              rows={6}
              autoFocus
              placeholder="Type something…"
              style={{
                width: "100%",
                resize: "vertical",
                background: "rgba(0,0,0,0.4)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                padding: "10px 12px",
                fontSize: 13,
                lineHeight: "20px",
                outline: "none",
                fontFamily: "inherit",
              }}
            />
          </div>

          <div>
            <div style={{ ...sectionLabel, display: "flex", justifyContent: "space-between" }}>
              <span>Font size</span>
              <span style={{ color: "#bbb", letterSpacing: 0 }}>{fontSize}px</span>
            </div>
            <input
              type="range"
              min={10}
              max={48}
              value={fontSize}
              onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
              style={{ width: "100%", accentColor: accent }}
            />
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              {[12, 14, 18, 24, 32].map((s) => (
                <button
                  key={s}
                  onClick={() => onChange({ fontSize: s })}
                  style={{
                    flex: 1,
                    background: fontSize === s ? `linear-gradient(135deg, ${accent}, ${accent}cc)` : "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: fontSize === s ? "#fff" : "#ccc",
                    padding: "6px 0",
                    borderRadius: 6,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div style={sectionLabel}>Alignment</div>
            <div style={{ display: "flex", gap: 6 }}>
              {(["left", "center", "right"] as TextAlign[]).map((a) => (
                <button
                  key={a}
                  onClick={() => onChange({ align: a })}
                  title={a}
                  style={{
                    flex: 1,
                    background: align === a ? `linear-gradient(135deg, ${accent}, ${accent}cc)` : "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: align === a ? "#fff" : "#ccc",
                    padding: "10px 0",
                    borderRadius: 8,
                    fontSize: 14,
                    cursor: "pointer",
                  }}
                >
                  {a === "left" ? "⯇" : a === "center" ? "≡" : "⯈"}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={onDelete}
            style={{
              background: "rgba(191,30,30,0.12)",
              border: "1px solid rgba(191,30,30,0.4)",
              color: "#ff8080",
              padding: "10px 12px",
              borderRadius: 8,
              fontSize: 13,
              cursor: "pointer",
              marginTop: 8,
            }}
          >
            🗑  Delete text node
          </button>
        </div>
      )}
    </Drawer>
  );
}
