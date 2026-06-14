import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  securityLevel: "loose",
  fontFamily: "inherit",
});

let counter = 0;

export function MermaidView({ source }: { source: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    if (!source.trim() || !ref.current) return;
    const id = `mmd-${Date.now()}-${counter++}`;
    mermaid
      .render(id, source)
      .then(({ svg }) => {
        if (!cancelled && ref.current) ref.current.innerHTML = svg;
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message || "Mermaid parse error");
      });
    return () => {
      cancelled = true;
    };
  }, [source]);

  if (error) {
    return (
      <div
        style={{
          color: "#bf6060",
          fontSize: 11,
          padding: 10,
          background: "rgba(140,30,30,0.08)",
          borderRadius: 6,
          border: "1px solid rgba(140,30,30,0.2)",
        }}
      >
        Diagram error: {error}
      </div>
    );
  }
  return <div ref={ref} style={{ width: "100%", overflow: "auto" }} />;
}
