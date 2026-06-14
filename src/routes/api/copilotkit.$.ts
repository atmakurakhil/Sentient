import { createFileRoute } from "@tanstack/react-router";

async function getHandler() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) {
    return async () =>
      new Response("Missing LOVABLE_API_KEY", { status: 500 });
  }

  await import("reflect-metadata");
  const [{ CopilotRuntime, OpenAIAdapter, copilotRuntimeNextJSAppRouterEndpoint }, { default: OpenAI }] =
    await Promise.all([import("@copilotkit/runtime"), import("openai")]);

  const openai = new OpenAI({
    apiKey: key,
    baseURL: "https://ai.gateway.lovable.dev/v1",
    defaultHeaders: {
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "copilotkit",
    },
  });

  const serviceAdapter = new OpenAIAdapter({
    openai,
    model: "google/gemini-2.5-flash",
  });

  const runtime = new CopilotRuntime();

  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: "/api/copilotkit",
  });

  return handleRequest;
}

const handler = async ({ request }: { request: Request }) =>
  (await getHandler())(request);

export const Route = createFileRoute("/api/copilotkit/$")({
  server: {
    handlers: {
      GET: handler,
      POST: handler,
      OPTIONS: handler,
    },
  },
});
