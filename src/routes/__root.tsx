import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "SENTIENT — AI-powered reasoning and mind mapping" },
      { name: "description", content: "Ask a question and SENTIENT maps ideas, tensions, evidence, and synthesis on an interactive AI reasoning canvas." },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "SENTIENT — AI-powered reasoning and mind mapping" },
      { property: "og:description", content: "Ask a question and SENTIENT maps ideas, tensions, evidence, and synthesis on an interactive AI reasoning canvas." },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "SENTIENT" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "SENTIENT — AI-powered reasoning and mind mapping" },
      { name: "twitter:description", content: "Ask a question and SENTIENT maps ideas, tensions, evidence, and synthesis on an interactive AI reasoning canvas." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/9b74e1d4-cb7b-49ea-8904-7246b6c1c5ef/id-preview-53e38f09--bf2f30a7-99da-493b-bfdf-7719a4ca6792.lovable.app-1778323601894.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/9b74e1d4-cb7b-49ea-8904-7246b6c1c5ef/id-preview-53e38f09--bf2f30a7-99da-493b-bfdf-7719a4ca6792.lovable.app-1778323601894.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const [AuthProvider, setAuthProvider] = useState<ComponentType<{ children: ReactNode }> | null>(null);

  useEffect(() => {
    let mounted = true;
    void import("@/lib/auth").then((module) => {
      if (mounted) setAuthProvider(() => module.AuthProvider);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const content = (
    <>
      <Outlet />
      <Toaster richColors position="top-right" />
    </>
  );

  return (
    <QueryClientProvider client={queryClient}>
      {AuthProvider ? <AuthProvider>{content}</AuthProvider> : content}
    </QueryClientProvider>
  );
}
