import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";

const DEFAULT_SYSTEM_PROMPT = `You are SENTIENT, a visual reasoning agent. When given 
a question, think through it by outputting reasoning nodes 
in NDJSON format — one complete JSON object per line, 
nothing else. No preamble, no explanation, no markdown.

Each line must be valid JSON matching this schema:
{"id":"n1","type":"concept","label":"Short label","content":"1-2 sentence explanation.","connects_to":[],"image":"optional short visual prompt"}

Type values:
- concept: a dimension, factor, or idea to explore  
- tension: a conflict, risk, or contradiction you found
- evidence: a specific data point or fact
- synthesis: your final conclusion (exactly one, always last)

Rules:
- Generate exactly 8 nodes: n1 through n8
- First 3 nodes: concept type
- Next 2 nodes: evidence type  
- Next 2 nodes: tension type
- Final node n8: synthesis type, connects_to must include 
  at least ["n1","n3","n6","n7"]
- connects_to for n1: empty array []
- Label: maximum 4 words
- Content: maximum 2 sentences
- "image" is OPTIONAL. Include it ONLY for 2-3 nodes whose meaning is strongly 
  visual (a tangible object, place, scene, diagram-able metaphor, product, or 
  iconic symbol). Skip it for purely abstract logic. When included, value is a 
  short, vivid visual prompt (max 12 words), e.g. "minimalist app icon glowing 
  on a dark phone screen" or "single sailboat on calm sea at dawn". Never put 
  text in the image. Do NOT add "image" to the synthesis node.
- Output NOTHING except raw JSON lines, one per line`;

type Body = {
  question?: unknown;
  model?: unknown;
  systemPromptOverride?: unknown;
  mcpContext?: unknown;
};

export const Route = createFileRoute("/api/sentient")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const body = (await request.json()) as Body;
        const { question, model, systemPromptOverride, mcpContext } = body;

        if (typeof question !== "string" || !question.trim()) {
          return new Response("Missing question", { status: 400 });
        }
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const useModel =
          typeof model === "string" && model.trim() ? model : "google/gemini-3-flash-preview";

        let system =
          typeof systemPromptOverride === "string" && systemPromptOverride.trim()
            ? systemPromptOverride
            : DEFAULT_SYSTEM_PROMPT;

        if (Array.isArray(mcpContext) && mcpContext.length > 0) {
          system += `\n\nThe user has acknowledged these MCP tools as relevant context: ${(mcpContext as string[]).join(", ")}. When applicable, ground evidence/concept nodes in things these tools could provide.`;
        }

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Lovable-API-Key": key,
            "X-Lovable-AIG-SDK": "vercel-ai-sdk",
          },
          body: JSON.stringify({
            model: useModel,
            stream: true,
            messages: [
              { role: "system", content: system },
              { role: "user", content: question },
            ],
          }),
        });

        if (!upstream.ok || !upstream.body) {
          const text = await upstream.text().catch(() => "");
          return new Response(text || "Upstream error", { status: upstream.status || 502 });
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
