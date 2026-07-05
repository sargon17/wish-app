import { createFileRoute } from "@tanstack/react-router";

import { getConvexHttpBaseUrl } from "@/lib/convexHttp";
import env from "@/env";

export const Route = createFileRoute("/api/project/$projectId/whats-new/exists")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const url = new URL(request.url);
        const version = url.searchParams.get("version") ?? "";
        const upstream = `${getConvexHttpBaseUrl(env.VITE_CONVEX_URL)}/api/project/${encodeURIComponent(params.projectId)}/whats-new/exists?version=${encodeURIComponent(version)}`;

        // The iOS SDK talks only to this public origin; any future native SDK API
        // call needs its own pass-through route like this one. Forward the client's
        // x-forwarded-for so upstream per-IP rate limiting sees real clients, not
        // this server's egress IP.
        const headers: Record<string, string> = {
          "x-api-key": request.headers.get("x-api-key") ?? "",
        };
        const forwardedFor = request.headers.get("x-forwarded-for");
        if (forwardedFor) {
          headers["x-forwarded-for"] = forwardedFor;
        }

        try {
          const response = await fetch(upstream, { headers, signal: AbortSignal.timeout(5000) });

          return new Response(await response.text(), {
            status: response.status,
            headers: { "content-type": "application/json" },
          });
        } catch {
          return Response.json({ error: "Upstream unavailable", code: "upstream_unavailable" }, { status: 502 });
        }
      },
    },
  },
});
