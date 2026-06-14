import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { callGatewayJson, stripFences } from "@/lib/sentient/gateway.server";

type Body = {
  node?: { label?: string; type?: string; content?: string };
  question?: string;
  model?: string;
};

const SYSTEM = `You produce an actionable roadmap for completing a single node of a reasoning map.
Output ONLY a JSON object with this shape:
{"steps":[{"title":"<=8 words","detail":"1 sentence, concrete next action"}, ...]}
Rules:
- Between 4 and 7 steps.
- Order steps from first to last.
- Use imperative voice ("Define...", "Build...", "Validate...").
- No preamble, no markdown fences.`;

export const Route = createFileRoute("/api/node/roadmap")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const body = (await request.json()) as Body;
        const node = body.node;
        if (!node?.label) return new Response("Missing node", { status: 400 });

        const userPrompt = [
          body.question ? `Overall question: ${body.question}` : null,
          `Node to plan:\n[${node.type ?? "concept"}] ${node.label}${
            node.content ? ` — ${node.content}` : ""
          }`,
          "Return JSON only.",
        ]
          .filter(Boolean)
          .join("\n\n");

        const r = await callGatewayJson<{ steps: { title: string; detail?: string }[] }>({
          model: body.model,
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: userPrompt },
          ],
          parse: (raw) => {
            try {
              const parsed = JSON.parse(stripFences(raw));
              if (!parsed?.steps || !Array.isArray(parsed.steps)) return null;
              return {
                steps: parsed.steps
                  .filter((s: { title?: unknown }) => typeof s.title === "string")
                  .slice(0, 8)
                  .map((s: { title: string; detail?: string }) => ({
                    title: String(s.title).slice(0, 80),
                    detail: typeof s.detail === "string" ? s.detail.slice(0, 240) : undefined,
                  })),
              };
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
