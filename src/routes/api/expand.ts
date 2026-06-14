import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";

const SYSTEM = `You extend a reasoning map. Given a parent node and the surrounding map context, output exactly 3 child nodes that deepen, challenge, or evidence the parent.

Output ONLY NDJSON, one JSON object per line. No preamble, no markdown.

Schema:
{"id":"x1","type":"concept|evidence|tension","label":"<=4 words","content":"1-2 sentences","image":"optional short visual prompt"}

Rules:
- Generate exactly 3 lines.
- Use varied types (mix of concept, evidence, tension) when possible.
- ids must start with "x" + short suffix.
- "image" is OPTIONAL. Include it ONLY when the node is strongly visual (a 
  tangible object, place, scene, product, or iconic symbol). Skip purely 
  abstract logic. Value: a vivid prompt, max 12 words, no text in image.
- Output nothing except the 3 JSON lines.`;

type Body = {
  parent?: { id?: string; type?: string; label?: string; content?: string };
  context?: unknown;
  question?: unknown;
  model?: unknown;
};

export const Route = createFileRoute("/api/expand")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const body = (await request.json()) as Body;
        const parent = body.parent;
        if (!parent || !parent.label) return new Response("Missing parent", { status: 400 });

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const useModel =
          typeof body.model === "string" && body.model.trim()
            ? body.model
            : "google/gemini-3-flash-preview";

        const ctxLines: string[] = [];
        if (typeof body.question === "string" && body.question.trim()) {
          ctxLines.push(`Original question: ${body.question}`);
        }
        if (Array.isArray(body.context)) {
          const summary = (body.context as Array<{ label?: string; type?: string }>)
            .filter((n) => n.label)
            .slice(0, 12)
            .map((n) => `- [${n.type ?? "node"}] ${n.label}`)
            .join("\n");
          if (summary) ctxLines.push(`Existing nodes:\n${summary}`);
        }
        ctxLines.push(
          `Parent node to expand:\n[${parent.type ?? "concept"}] ${parent.label}${
            parent.content ? ` — ${parent.content}` : ""
          }`,
        );

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Lovable-API-Key": key,
          },
          body: JSON.stringify({
            model: useModel,
            stream: false,
            messages: [
              { role: "system", content: SYSTEM },
              { role: "user", content: ctxLines.join("\n\n") },
            ],
          }),
        });
        if (!upstream.ok) {
          const text = await upstream.text().catch(() => "");
          return new Response(text || "Upstream error", { status: upstream.status || 502 });
        }
        const json = (await upstream.json()) as {
          choices?: { message?: { content?: string } }[];
        };
        const content = json.choices?.[0]?.message?.content?.trim() ?? "";

        const children: Array<{ id: string; type: string; label: string; content?: string; image?: string }> = [];
        for (const raw of content.split("\n")) {
          const line = raw.trim();
          if (!line || !line.startsWith("{")) continue;
          try {
            const p = JSON.parse(line);
            if (p && typeof p.label === "string" && typeof p.id === "string") {
              const t =
                p.type === "evidence" || p.type === "tension" || p.type === "concept"
                  ? p.type
                  : "concept";
              const image = typeof p.image === "string" && p.image.trim() ? p.image.trim() : undefined;
              children.push({ id: p.id, type: t, label: p.label, content: p.content, image });
            }
          } catch {
            /* skip */
          }
        }

        return new Response(JSON.stringify({ children: children.slice(0, 3) }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
