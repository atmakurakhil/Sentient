import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";

type Mode = "summarize" | "critique" | "brainstorm" | "devil";

const PROMPTS: Record<Mode, { sys: string; label: string }> = {
  summarize: {
    label: "Summary",
    sys: "You distill a node down to its essence. Output 1-2 crisp sentences capturing the core idea — no filler, no preamble.",
  },
  critique: {
    label: "Critique",
    sys: "You critique the parent node sharply but fairly. Identify the single biggest weakness, hidden assumption, or risk in 1-2 sentences. No preamble.",
  },
  brainstorm: {
    label: "Ideas",
    sys: "You generate 3 short, divergent ideas branching from the parent node. Output as a single sentence with 3 ideas separated by ' • '. No preamble.",
  },
  devil: {
    label: "Devil's advocate",
    sys: "You are the devil's advocate. Argue the strongest counter-position to the parent node in 1-2 sentences. No preamble, no hedging.",
  },
};

type Body = {
  parent?: { label?: string; content?: string; type?: string };
  mode?: Mode;
  question?: string;
  model?: string;
};

export const Route = createFileRoute("/api/think")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const body = (await request.json()) as Body;
        const parent = body.parent;
        const mode = body.mode;
        if (!parent?.label || !mode || !PROMPTS[mode])
          return new Response("Missing parent or mode", { status: 400 });

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const useModel =
          typeof body.model === "string" && body.model.trim()
            ? body.model
            : "google/gemini-3-flash-preview";

        const userMsg =
          (body.question ? `Original question: ${body.question}\n\n` : "") +
          `Parent node:\n[${parent.type ?? "concept"}] ${parent.label}` +
          (parent.content ? ` — ${parent.content}` : "");

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
          body: JSON.stringify({
            model: useModel,
            stream: false,
            messages: [
              { role: "system", content: PROMPTS[mode].sys },
              { role: "user", content: userMsg },
            ],
          }),
        });
        if (!upstream.ok) {
          const text = await upstream.text().catch(() => "");
          return new Response(text || "Upstream error", { status: upstream.status || 502 });
        }
        const json = (await upstream.json()) as { choices?: { message?: { content?: string } }[] };
        const content = (json.choices?.[0]?.message?.content ?? "").trim();
        return new Response(
          JSON.stringify({ label: PROMPTS[mode].label, content, mode }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
