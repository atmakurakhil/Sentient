import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { callGatewayJson, stripFences } from "@/lib/sentient/gateway.server";

type Body = {
  node?: { label?: string; type?: string; content?: string };
  question?: string;
  model?: string;
  kind?: "howto" | "architecture" | "marketing" | "build";
  notes?: string;
  roadmap?: { title: string; detail?: string; done?: boolean }[];
};

const SYSTEM = `You are an expert technical writer producing a polished, ship-ready document
about ONE node of a reasoning map. Output PLAIN MARKDOWN (no code fences around the
whole doc). Structure:

# <Node Label>

> <one-sentence elevator description>

## Overview
2-4 sentences: what this is, why it matters in context of the overall question.

## How-to / Step-by-step
A numbered list of 5-9 concrete, imperative steps with brief sub-bullets.

## Architecture / Approach
Short prose + a fenced \`\`\`mermaid\`\`\` block (flowchart TD, 4-8 nodes) showing the
key components/flow. Use safe alphanumeric ids.

## Risks & Tradeoffs
Bullet list, 3-5 items.

## Definition of done
Bullet checklist of measurable outcomes.

Rules:
- Be specific to the node's label and the user's question, not generic.
- Use crisp prose. No marketing fluff.
- Never include placeholder text like "TODO".`;

export const Route = createFileRoute("/api/node/doc")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const body = (await request.json()) as Body;
        const node = body.node;
        if (!node?.label) return new Response("Missing node", { status: 400 });

        const kindLabel =
          body.kind === "marketing"
            ? "marketing playbook"
            : body.kind === "build"
              ? "build plan"
              : body.kind === "architecture"
                ? "architecture guide"
                : "how-to guide";

        const userPrompt = [
          body.question ? `Overall question / project: ${body.question}` : null,
          `Node: [${node.type ?? "concept"}] ${node.label}` +
            (node.content ? ` — ${node.content}` : ""),
          body.notes ? `Existing notes:\n${body.notes}` : null,
          body.roadmap?.length
            ? `Existing roadmap:\n${body.roadmap.map((s) => `- ${s.title}${s.detail ? ` (${s.detail})` : ""}`).join("\n")}`
            : null,
          `Produce a ${kindLabel} document in the required Markdown structure.`,
        ]
          .filter(Boolean)
          .join("\n\n");

        const r = await callGatewayJson<{ markdown: string }>({
          model: body.model,
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: userPrompt },
          ],
          parse: (raw) => {
            const md = stripFences(raw).trim();
            if (md.length < 60) return null;
            return { markdown: md };
          },
        });

        if (!r.ok) return new Response(r.error, { status: r.status });
        return Response.json(r.data);
      },
    },
  },
});
