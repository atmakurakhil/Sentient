import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { callGatewayJson, stripFences } from "@/lib/sentient/gateway.server";

type Body = {
  node?: { label?: string; type?: string; content?: string };
  question?: string;
  model?: string;
  kind?: "flowchart" | "mindmap" | "sequence";
  current?: string;
  instruction?: string;
  sketchSvg?: string;
};

const SYSTEM = `You output a single Mermaid diagram. Output ONLY raw Mermaid source — no markdown fences, no commentary.
Use one of: flowchart TD, mindmap, sequenceDiagram (default flowchart TD).
Keep it under 20 nodes. Quote labels with spaces. No styling, no classDefs.
If the user supplies an existing diagram and an edit instruction, return the FULL updated diagram (not a diff).
If the user supplies a rough hand-drawn SVG sketch, infer the intended structure and return a clean equivalent diagram.`;

export const Route = createFileRoute("/api/node/diagram")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const body = (await request.json()) as Body;
        const node = body.node;
        if (!node?.label && !body.sketchSvg) return new Response("Missing node or sketch", { status: 400 });

        const kind = body.kind ?? "flowchart";
        const userPrompt = [
          body.question ? `Overall question: ${body.question}` : null,
          node?.label
            ? `Node:\n[${node.type ?? "concept"}] ${node.label}${node.content ? ` — ${node.content}` : ""}`
            : null,
          `Diagram style: ${kind}.`,
          body.current ? `Existing diagram (Mermaid):\n${body.current}` : null,
          body.instruction ? `Edit instruction: ${body.instruction}` : null,
          body.sketchSvg
            ? `Hand-drawn sketch (SVG paths describing the user's rough drawing):\n${body.sketchSvg.slice(0, 4000)}`
            : null,
          "Return mermaid source only.",
        ]
          .filter(Boolean)
          .join("\n\n");

        const r = await callGatewayJson<{ mermaid: string }>({
          model: body.model,
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: userPrompt },
          ],
          parse: (raw) => {
            const cleaned = stripFences(raw);
            if (!cleaned) return null;
            return { mermaid: cleaned };
          },
        });

        if (!r.ok) return new Response(r.error, { status: r.status });
        return Response.json(r.data);
      },
    },
  },
});
