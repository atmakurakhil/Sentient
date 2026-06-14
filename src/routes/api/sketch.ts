import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { callGatewayJson, stripFences } from "@/lib/sentient/gateway.server";

type Body = {
  question?: string;
  model?: string;
  sketchSvg?: string;
  strokeCount?: number;
  instruction?: string;
};

const SYSTEM = `You translate a user's rough hand-drawn sketch on a canvas into a clean,
structured reasoning map. Output ONLY a JSON object:
{"summary":"<one sentence about what you saw>","nodes":[{"id":"n1","type":"concept|tension|evidence|synthesis","label":"<=4 words","content":"1 short sentence"}, ...],"edges":[{"source":"n1","target":"n2"}, ...]}
Rules:
- 3 to 7 nodes total. Exactly one synthesis node when it makes sense.
- Use lowercase ids like n1, n2, n3.
- Edges connect existing ids only.
- No markdown fences, no preamble.`;

export const Route = createFileRoute("/api/sketch")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const body = (await request.json()) as Body;
        if (!body.sketchSvg && !body.instruction) {
          return new Response("Missing sketch or instruction", { status: 400 });
        }

        const userPrompt = [
          body.question ? `Overall question: ${body.question}` : null,
          body.instruction ? `User intent: ${body.instruction}` : null,
          body.sketchSvg
            ? `SVG of the sketch (${body.strokeCount ?? "?"} strokes):\n${body.sketchSvg.slice(0, 6000)}`
            : null,
          "Return JSON only.",
        ]
          .filter(Boolean)
          .join("\n\n");

        const r = await callGatewayJson<{
          summary: string;
          nodes: { id: string; type: string; label: string; content?: string }[];
          edges: { source: string; target: string }[];
        }>({
          model: body.model,
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: userPrompt },
          ],
          parse: (raw) => {
            try {
              const j = JSON.parse(stripFences(raw));
              if (!Array.isArray(j?.nodes)) return null;
              const allowed = new Set(["concept", "tension", "evidence", "synthesis"]);
              const nodes = j.nodes
                .filter((n: { id?: unknown; label?: unknown }) => typeof n.id === "string" && typeof n.label === "string")
                .slice(0, 8)
                .map((n: { id: string; type?: string; label: string; content?: string }) => ({
                  id: n.id,
                  type: allowed.has(n.type ?? "") ? (n.type as string) : "concept",
                  label: String(n.label).slice(0, 60),
                  content: typeof n.content === "string" ? n.content.slice(0, 200) : undefined,
                }));
              const ids = new Set(nodes.map((n: { id: string }) => n.id));
              const edges = Array.isArray(j.edges)
                ? j.edges
                    .filter((e: { source?: unknown; target?: unknown }) =>
                      typeof e.source === "string" && typeof e.target === "string" && ids.has(e.source) && ids.has(e.target),
                    )
                    .slice(0, 16)
                : [];
              return { summary: typeof j.summary === "string" ? j.summary : "", nodes, edges };
            } catch {
              return null;
            }
          },
        });

        if (!r.ok) return new Response(r.error, { status: r.status });
        return Response.json(r.data);
      },
    },
  },
});
