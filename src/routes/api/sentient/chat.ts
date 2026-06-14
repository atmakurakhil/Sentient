import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";

type Body = {
  question?: unknown;
  message?: unknown;
  history?: unknown;
  nodes?: unknown;
  edges?: unknown;
  model?: unknown;
};

export const Route = createFileRoute("/api/sentient/chat")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const body = (await request.json()) as Body;
        const message = typeof body.message === "string" ? body.message.trim() : "";
        if (!message) return new Response("Missing message", { status: 400 });

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const model =
          typeof body.model === "string" && body.model.trim()
            ? body.model
            : "google/gemini-3-flash-preview";

        const question = typeof body.question === "string" ? body.question : "";
        const nodes = Array.isArray(body.nodes) ? (body.nodes as { type?: string; label?: string; content?: string }[]) : [];
        const edges = Array.isArray(body.edges) ? (body.edges as { source?: string; target?: string }[]) : [];
        const history = Array.isArray(body.history)
          ? (body.history as { role: "user" | "assistant"; content: string }[]).slice(-10)
          : [];

        const mapSummary = nodes.length
          ? nodes
              .map((n, i) => `${i + 1}. [${n.type ?? "concept"}] ${n.label ?? ""}${n.content ? ` — ${n.content}` : ""}`)
              .join("\n")
          : "(empty canvas)";

        const system = `You are SENTIENT, a conversational reasoning copilot.
You can chat freely with the user about their reasoning map and offer ideas, critique, next steps, and clarifications.
You do NOT modify the canvas yourself — you talk. When relevant, suggest concrete next nodes, tensions, or evidence the user could add.

Map question: ${question || "(none yet)"}

Current map (${nodes.length} nodes, ${edges.length} edges):
${mapSummary}

Style:
- Conversational, warm, sharp.
- Markdown allowed (lists, **bold**).
- Under 180 words unless the user asks for depth.
- If the canvas is empty, gently encourage the user to ask a question or describe what they want to map.`;

        let upstream: Response;
        try {
          upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
            body: JSON.stringify({
              model,
              stream: true,
              messages: [
                { role: "system", content: system },
                ...history,
                { role: "user", content: message },
              ],
            }),
          });
        } catch (e) {
          return new Response((e as Error).message, { status: 502 });
        }
        if (!upstream.ok || !upstream.body) {
          const t = await upstream.text().catch(() => "");
          return new Response(t || "Upstream error", { status: upstream.status || 502 });
        }
        return new Response(upstream.body, {
          status: 200,
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      },
    },
  },
});
