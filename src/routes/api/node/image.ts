import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";

type Body = {
  prompt?: string;
  node?: { label?: string; content?: string };
  model?: string;
};

// Lovable AI Gateway image generation. Models return a base64 image either in
// `message.images[].image_url.url` or inline as a data: URL inside content.
export const Route = createFileRoute("/api/node/image")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const body = (await request.json()) as Body;
        const node = body.node;
        const userPrompt = (body.prompt || node?.label || "").trim();
        if (!userPrompt) return new Response("Missing prompt", { status: 400 });

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const model =
          typeof body.model === "string" && body.model.trim()
            ? body.model
            : "google/gemini-3.1-flash-image-preview";

        const fullPrompt = node
          ? `Create a clean, minimal illustration that visually represents this concept: "${node.label}". ${
              node.content ? `Context: ${node.content}. ` : ""
            }Style direction: ${userPrompt}. Single image, no text overlays.`
          : userPrompt;

        let upstream: Response;
        try {
          upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
            body: JSON.stringify({
              model,
              modalities: ["image", "text"],
              messages: [{ role: "user", content: fullPrompt }],
            }),
          });
        } catch (e) {
          return new Response((e as Error).message, { status: 502 });
        }

        if (!upstream.ok) {
          const text = await upstream.text().catch(() => "");
          return new Response(text || "Upstream error", { status: upstream.status });
        }

        const json = (await upstream.json()) as {
          choices?: {
            message?: {
              content?: string | { type: string; text?: string; image_url?: { url?: string } }[];
              images?: { image_url?: { url?: string } }[];
            };
          }[];
        };

        const msg = json.choices?.[0]?.message;
        let dataUrl: string | undefined;

        // Common shape on Lovable AI: message.images[0].image_url.url
        if (msg?.images?.length) {
          dataUrl = msg.images[0]?.image_url?.url;
        }
        // Fallback: scan content array parts
        if (!dataUrl && Array.isArray(msg?.content)) {
          for (const part of msg.content) {
            if (part?.image_url?.url) {
              dataUrl = part.image_url.url;
              break;
            }
          }
        }
        // Fallback: a raw data: url inside string content
        if (!dataUrl && typeof msg?.content === "string") {
          const m = msg.content.match(/data:image\/[a-zA-Z+]+;base64,[A-Za-z0-9+/=]+/);
          if (m) dataUrl = m[0];
        }

        if (!dataUrl) return new Response("No image returned", { status: 502 });
        return Response.json({ dataUrl });
      },
    },
  },
});
