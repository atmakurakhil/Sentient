// Server-only helper for calling Lovable AI Gateway via raw HTTP.
// Mirrors the pattern used in /api/expand.ts so all node endpoints stay consistent.

export type GatewayMessage = { role: "system" | "user" | "assistant"; content: string };

export async function callGatewayJson<T = unknown>(opts: {
  model?: string;
  messages: GatewayMessage[];
  parse: (content: string) => T | null;
  fallback?: T;
}): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string }> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return { ok: false, status: 500, error: "Missing LOVABLE_API_KEY" };

  const model = opts.model && opts.model.trim() ? opts.model : "google/gemini-3-flash-preview";

  let res: Response;
  try {
    res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({ model, stream: false, messages: opts.messages }),
    });
  } catch (e) {
    return { ok: false, status: 502, error: (e as Error).message };
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { ok: false, status: res.status, error: text || "Upstream error" };
  }

  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = json.choices?.[0]?.message?.content?.trim() ?? "";
  const parsed = opts.parse(content);
  if (parsed === null) {
    if (opts.fallback) return { ok: true, data: opts.fallback };
    return { ok: false, status: 502, error: "Could not parse model output" };
  }
  return { ok: true, data: parsed };
}

// Strip ```json fences if model wraps output.
export function stripFences(s: string) {
  return s.replace(/^```(?:json|csv|markdown|mermaid)?\s*/i, "").replace(/```\s*$/i, "").trim();
}
