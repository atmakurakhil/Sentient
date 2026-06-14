import { Drawer } from "./Drawer";
import type { SavedMap } from "@/lib/sentient/storage";

type Props = {
  open: boolean;
  onClose: () => void;
  maps: SavedMap[];
  accent: string;
  onLoad: (m: SavedMap) => void;
  onDelete: (id: string) => void;
  onSaveCurrent: () => void;
  canSave: boolean;
};

export function MemoryDrawer({ open, onClose, maps, accent, onLoad, onDelete, onSaveCurrent, canSave }: Props) {
  return (
    <Drawer open={open} onClose={onClose} title="Memory">
      <button
        onClick={onSaveCurrent}
        disabled={!canSave}
        style={{
          width: "100%",
          padding: "10px",
          background: canSave ? accent : "rgba(255,255,255,0.06)",
          color: "#fff",
          border: "none",
          borderRadius: 10,
          fontSize: 13,
          fontWeight: 600,
          marginBottom: 16,
          cursor: canSave ? "pointer" : "not-allowed",
          opacity: canSave ? 1 : 0.5,
        }}
      >
        Save current map
      </button>

      {maps.length === 0 ? (
        <div style={{ color: "#666", fontSize: 12, fontStyle: "italic", textAlign: "center", marginTop: 24 }}>
          No saved maps yet.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {maps
            .slice()
            .sort((a, b) => b.createdAt - a.createdAt)
            .map((m) => (
              <div
                key={m.id}
                style={{
                  padding: "10px 12px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <button
                  onClick={() => onLoad(m)}
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "none",
                    color: "#e7e7ea",
                    textAlign: "left",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: "#666" }}>
                    {new Date(m.createdAt).toLocaleString()}
                  </div>
                </button>
                <button
                  onClick={() => onDelete(m.id)}
                  aria-label="Delete"
                  style={{
                    background: "transparent",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#888",
                    borderRadius: 6,
                    width: 26,
                    height: 26,
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
        </div>
      )}
    </Drawer>
  );
}
