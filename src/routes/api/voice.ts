import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";

const VOICE_SYSTEM_PROMPT = `You are SENTIENT in voice mode — a thoughtful, calm reasoning companion.
The user is speaking to you out loud and will hear your reply spoken back.

Rules:
- Reply in 1-3 short sentences. No lists, no markdown, no code, no headings.
- Sound natural and conversational, like a real spoken answer.
- If the user asks you to map or visualize something, tell them to tap "Build the Map" — don't try to output nodes here.`;

type Msg = { role: "user" | "assistant" | "system"; content: string };
type Body = { messages?: unknown; model?: unknown };

export const Route = createFileRoute("/api/voice")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const body = (await request.json()) as Body;
        const messages = Array.isArray(body.messages) ? (body.messages as Msg[]) : [];
        if (!messages.length) return new Response("Missing messages", { status: 400 });

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const useModel =
          typeof body.model === "string" && body.model.trim()
            ? (body.model as string)
            : "google/gemini-3-flash-preview";

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Lovable-API-Key": key,
          },
          body: JSON.stringify({
            model: useModel,
            stream: false,
            messages: [{ role: "system", content: VOICE_SYSTEM_PROMPT }, ...messages],
          }),
        });

        if (!upstream.ok) {
          const text = await upstream.text().catch(() => "");
          return new Response(text || "Upstream error", { status: upstream.status || 502 });
        }
        const json = (await upstream.json()) as {
          choices?: { message?: { content?: string } }[];
        };
        const reply = json.choices?.[0]?.message?.content?.trim() ?? "";
        return new Response(JSON.stringify({ reply }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
