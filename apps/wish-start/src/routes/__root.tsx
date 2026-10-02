import { HeadContent, Scripts, createRootRoute, useRouterState } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState, type ComponentType } from "react";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import ThemeProvider from "../providers/ThemeProvider";
import appCss from "../styles.css?url";

const AppProviders = lazy(() => import("../providers/AppProviders"));
const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('theme');var mode=(stored==='light'||stored==='dark'||stored==='auto')?stored:'auto';var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=mode==='auto'?(prefersDark?'dark':'light'):mode;var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(resolved);if(mode==='auto'){root.removeAttribute('data-theme')}else{root.setAttribute('data-theme',mode)}root.style.colorScheme=resolved;}catch(e){}})();`;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Wish app (TanStack Start)",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  const isEmbed = useRouterState({ select: (state) => state.location.pathname === "/embed" });
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body className="font-sans [overflow-wrap:anywhere] antialiased selection:bg-[rgba(79,184,178,0.24)]">
        {isEmbed ? (
          <ThemeProvider>
            <TooltipProvider>
              {children}
              <Toaster />
            </TooltipProvider>
          </ThemeProvider>
        ) : (
          <Suspense
            fallback={
              <p role="status" className="p-4">
                Loading…
              </p>
            }
          >
            <AppProviders>
              {children}
              <AppDevtools />
            </AppProviders>
          </Suspense>
        )}
        <Scripts />
      </body>
    </html>
  );
}

function AppDevtools() {
  const [Devtools, setDevtools] = useState<ComponentType<any> | null>(null);
  const [RouterDevtoolsPanel, setRouterDevtoolsPanel] = useState<ComponentType | null>(null);

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    let active = true;

    Promise.all([import("@tanstack/react-devtools"), import("@tanstack/react-router-devtools")])
      .then(([devtoolsModule, routerDevtoolsModule]) => {
        if (!active) return;

        setDevtools(() => devtoolsModule.TanStackDevtools as ComponentType<any>);
        setRouterDevtoolsPanel(() => routerDevtoolsModule.TanStackRouterDevtoolsPanel);
      })
      .catch(() => {
        // Devtools are optional and should never block rendering.
      });

    return () => {
      active = false;
    };
  }, []);

  if (!import.meta.env.DEV || !Devtools || !RouterDevtoolsPanel) {
    return null;
  }

  return (
    <Devtools
      config={{
        position: "bottom-right",
      }}
      plugins={[
        {
          name: "Tanstack Router",
          render: <RouterDevtoolsPanel />,
        },
      ]}
    />
  );
}
