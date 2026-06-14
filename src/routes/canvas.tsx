import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ComponentType } from "react";
import { z } from "zod";

const openOptions = z.enum(["memory", "mcp", "settings", "voice", "share"]);

const searchSchema = z.object({
  q: z.string().optional(),
  open: openOptions.optional(),
  map: z.string().uuid().optional(),
  token: z.string().uuid().optional(),
});

export const Route = createFileRoute("/canvas")({
  validateSearch: (s) => searchSchema.parse(s),
  component: CanvasPage,
  head: () => ({
    meta: [
      { title: "Canvas — SENTIENT" },
      { name: "description", content: "Explore an interactive AI reasoning canvas: map ideas, tensions, and synthesis with voice mode, memory, MCP connectors, and live collaboration." },
      { property: "og:title", content: "SENTIENT Canvas — interactive AI reasoning workspace" },
      { property: "og:description", content: "Map ideas, tensions, and synthesis on an interactive AI reasoning canvas with voice, memory, MCP, and collaboration." },
    ],
  }),
});

function CanvasPage() {
  const { q, open, map, token } = Route.useSearch();
  const [SentientApp, setSentientApp] = useState<ComponentType<{
    initialQuestion?: string;
    initialOpen?: "memory" | "mcp" | "settings" | "voice" | "share";
    initialMapId?: string;
    initialToken?: string;
  }> | null>(null);

  useEffect(() => {
    let mounted = true;
    void import("@/components/sentient/SentientApp").then((module) => {
      if (mounted) setSentientApp(() => module.SentientApp);
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (!SentientApp) {
    return <div style={{ minHeight: "100vh", background: "#050505" }} />;
  }

  return <SentientApp initialQuestion={q} initialOpen={open} initialMapId={map} initialToken={token} />;
}
