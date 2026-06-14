import type { ReactNode } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: number;
};

export function Drawer({ open, onClose, title, children, width = 420 }: Props) {
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.2s ease",
          zIndex: 40,
        }}
      />
      <aside
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          height: "100vh",
          width,
          maxWidth: "92vw",
          background: "rgba(14,14,18,0.97)",
          borderLeft: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "-20px 0 40px rgba(0,0,0,0.5)",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)",
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          color: "#e7e7ea",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, letterSpacing: 0.5 }}>{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#aaa",
              borderRadius: 6,
              width: 28,
              height: 28,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            ✕
          </button>
        </header>
        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>{children}</div>
      </aside>
    </>
  );
}
