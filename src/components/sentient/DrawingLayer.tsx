import { useEffect, useRef, useState } from "react";

export type Stroke = {
  id: string;
  color: string;
  width: number;
  points: { x: number; y: number }[];
};

export type DrawTool = "pen" | "eraser" | null;

type Props = {
  active: boolean;
  tool: DrawTool;
  color: string;
  strokes: Stroke[];
  setStrokes: (s: Stroke[] | ((prev: Stroke[]) => Stroke[])) => void;
};

export function DrawingLayer({ active, tool, color, strokes, setStrokes }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [current, setCurrent] = useState<Stroke | null>(null);
  const drawingRef = useRef(false);

  useEffect(() => {
    if (!active) {
      drawingRef.current = false;
      setCurrent(null);
    }
  }, [active]);

  const getPoint = (e: React.PointerEvent) => {
    const rect = svgRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onDown = (e: React.PointerEvent) => {
    if (!active || !tool) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    drawingRef.current = true;
    if (tool === "eraser") {
      eraseAt(getPoint(e));
      return;
    }
    setCurrent({
      id: crypto.randomUUID(),
      color,
      width: 2.5,
      points: [getPoint(e)],
    });
  };

  const onMove = (e: React.PointerEvent) => {
    if (!drawingRef.current || !active) return;
    if (tool === "eraser") {
      eraseAt(getPoint(e));
      return;
    }
    setCurrent((s) => (s ? { ...s, points: [...s.points, getPoint(e)] } : s));
  };

  const onUp = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    if (tool === "pen" && current && current.points.length > 1) {
      const stroke = current;
      setStrokes((prev) => [...prev, stroke]);
    }
    setCurrent(null);
  };

  const eraseAt = (p: { x: number; y: number }) => {
    const r = 12;
    setStrokes((prev) =>
      prev.filter(
        (s) => !s.points.some((pt) => Math.hypot(pt.x - p.x, pt.y - p.y) < r),
      ),
    );
  };

  const toPath = (s: Stroke) => {
    if (s.points.length < 2) return "";
    const [first, ...rest] = s.points;
    return `M ${first.x} ${first.y} ` + rest.map((p) => `L ${p.x} ${p.y}`).join(" ");
  };

  return (
    <svg
      ref={svgRef}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerLeave={onUp}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: active && tool ? "auto" : "none",
        cursor: tool === "eraser" ? "cell" : tool === "pen" ? "crosshair" : "default",
        zIndex: 5,
        touchAction: "none",
      }}
    >
      {strokes.map((s) => (
        <path
          key={s.id}
          d={toPath(s)}
          stroke={s.color}
          strokeWidth={s.width}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.95}
        />
      ))}
      {current && (
        <path
          d={toPath(current)}
          stroke={current.color}
          strokeWidth={current.width}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.95}
        />
      )}
    </svg>
  );
}
