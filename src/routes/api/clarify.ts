import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";

type Body = { question?: unknown; model?: unknown };

export const Route = createFileRoute("/api/clarify")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const { question, model } = (await request.json()) as Body;
        if (typeof question !== "string" || !question.trim()) {
          return new Response("Missing question", { status: 400 });
        }
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const useModel =
          typeof model === "string" && model.trim() ? model : "google/gemini-3-flash-preview";

        const system = `You are SENTIENT's clarifier. Given a user's question, return EXACTLY 3 short, high-leverage clarifying questions that will dramatically improve the quality of the reasoning map you'd produce. Each question must be answerable in one short sentence. Output ONLY raw JSON of this shape (no prose, no fences):
{"questions":[{"q":"...","placeholder":"short example answer"},{"q":"...","placeholder":"..."},{"q":"...","placeholder":"..."}]}`;

        let upstream: Response;
        try {
          upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
            body: JSON.stringify({
              model: useModel,
              stream: false,
              messages: [
                { role: "system", content: system },
                { role: "user", content: question },
              ],
            }),
          });
        } catch (e) {
          return new Response((e as Error).message, { status: 502 });
        }
        if (!upstream.ok) {
          const t = await upstream.text().catch(() => "");
          return new Response(t || "Upstream error", { status: upstream.status });
        }
        const json = (await upstream.json()) as { choices?: { message?: { content?: string } }[] };
        let content = json.choices?.[0]?.message?.content?.trim() ?? "";
        content = content.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
        try {
          const parsed = JSON.parse(content) as {
            questions?: { q: string; placeholder?: string }[];
          };
          const questions = (parsed.questions || []).slice(0, 3).map((x) => ({
            q: String(x.q || "").trim(),
            placeholder: String(x.placeholder || "").trim(),
          }));
          if (!questions.length) throw new Error("empty");
          return Response.json({ questions });
        } catch {
          return Response.json({
            questions: [
              { q: "Who is the audience?", placeholder: "e.g. early-stage founders" },
              { q: "What is the goal or outcome?", placeholder: "e.g. 1k signups in 30 days" },
              { q: "Any constraints or context?", placeholder: "e.g. solo dev, $0 budget" },
            ],
          });
        }
      },
    },
  },
});
