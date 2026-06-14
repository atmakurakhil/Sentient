import { Drawer } from "./Drawer";
import { MCP_CATALOG } from "@/lib/sentient/storage";

type Props = {
  open: boolean;
  onClose: () => void;
  enabled: Record<string, boolean>;
  onToggle: (id: string) => void;
  accent: string;
};

export function McpDrawer({ open, onClose, enabled, onToggle, accent }: Props) {
  return (
    <Drawer open={open} onClose={onClose} title="MCP Connectors">
      <p style={{ color: "#888", fontSize: 12, lineHeight: 1.6, marginTop: 0, marginBottom: 18 }}>
        Acknowledge the tools SENTIENT can reason about. Enabled connectors are passed
        as context so the agent can ground its map in those sources.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {MCP_CATALOG.map((c) => {
          const on = !!enabled[c.id];
          return (
            <button
              key={c.id}
              onClick={() => onToggle(c.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 12px",
                background: on ? `${accent}22` : "rgba(255,255,255,0.03)",
                border: `1px solid ${on ? accent : "rgba(255,255,255,0.08)"}`,
                borderRadius: 10,
                color: "#e7e7ea",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.15s",
              }}
            >
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: on ? accent : "rgba(255,255,255,0.06)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  color: on ? "#fff" : "#888",
                }}
              >
                {c.icon}
              </span>
              <span style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</div>
                <div style={{ fontSize: 11, color: "#777" }}>{c.blurb}</div>
              </span>
              <span
                style={{
                  width: 32,
                  height: 18,
                  borderRadius: 999,
                  background: on ? accent : "rgba(255,255,255,0.1)",
                  position: "relative",
                  transition: "background 0.2s",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: 2,
                    left: on ? 16 : 2,
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    background: "#fff",
                    transition: "left 0.2s",
                  }}
                />
              </span>
            </button>
          );
        })}
      </div>
    </Drawer>
  );
}
