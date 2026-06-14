import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { callGatewayJson, stripFences } from "@/lib/sentient/gateway.server";

type Body = {
  node?: { label?: string; type?: string; content?: string };
  question?: string;
  model?: string;
  hint?: string;
};

const SYSTEM = `You produce a small structured table to support a reasoning-map node.
Output ONLY JSON of shape:
{"columns":["Col A","Col B",...],"rows":[["...","..."], ...]}
Rules:
- 2 to 5 columns, 3 to 8 rows.
- All cells are strings <= 80 chars.
- No markdown, no preamble.`;

export const Route = createFileRoute("/api/node/table")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const body = (await request.json()) as Body;
        const node = body.node;
        if (!node?.label) return new Response("Missing node", { status: 400 });

        const userPrompt = [
          body.question ? `Overall question: ${body.question}` : null,
          `Node:\n[${node.type ?? "concept"}] ${node.label}${
            node.content ? ` — ${node.content}` : ""
          }`,
          body.hint ? `User hint: ${body.hint}` : null,
          "Return JSON only.",
        ]
          .filter(Boolean)
          .join("\n\n");

        const r = await callGatewayJson<{ columns: string[]; rows: string[][] }>({
          model: body.model,
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: userPrompt },
          ],
          parse: (raw) => {
            try {
              const parsed = JSON.parse(stripFences(raw));
              if (!Array.isArray(parsed?.columns) || !Array.isArray(parsed?.rows)) return null;
              const columns = parsed.columns.map((c: unknown) => String(c).slice(0, 40)).slice(0, 5);
              const rows = parsed.rows
                .slice(0, 8)
                .map((r: unknown[]) =>
                  Array.isArray(r) ? r.slice(0, columns.length).map((c) => String(c).slice(0, 80)) : [],
                )
                .filter((r: string[]) => r.length === columns.length);
              if (!columns.length || !rows.length) return null;
              return { columns, rows };
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
