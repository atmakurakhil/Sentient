import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";

type Body = {
  node?: { label?: string; type?: string; content?: string };
  question?: string;
  history?: { role: "user" | "assistant"; content: string }[];
  message?: string;
  model?: string;
};

export const Route = createFileRoute("/api/node/chat")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const body = (await request.json()) as Body;
        const node = body.node;
        const message = (body.message || "").trim();
        if (!node?.label || !message) return new Response("Missing input", { status: 400 });

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const model =
          typeof body.model === "string" && body.model.trim()
            ? body.model
            : "google/gemini-3-flash-preview";

        const system = `You are SENTIENT, helping the user think through one specific node of their reasoning map.
Stay laser-focused on this node:
[${node.type ?? "concept"}] ${node.label}${node.content ? ` — ${node.content}` : ""}
${body.question ? `Overall map question: ${body.question}` : ""}
Be concise (under 120 words), structured, and concrete. Suggest next actions when useful.`;

        const messages = [
          { role: "system" as const, content: system },
          ...(body.history ?? []).slice(-8),
          { role: "user" as const, content: message },
        ];

        let upstream: Response;
        try {
          upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
            body: JSON.stringify({ model, stream: false, messages }),
          });
        } catch (e) {
          return new Response((e as Error).message, { status: 502 });
        }

        if (!upstream.ok) {
          const text = await upstream.text().catch(() => "");
          return new Response(text || "Upstream error", { status: upstream.status });
        }

        const json = (await upstream.json()) as {
          choices?: { message?: { content?: string } }[];
        };
        const reply = json.choices?.[0]?.message?.content?.trim() ?? "";
        return Response.json({ reply });
      },
    },
  },
});
