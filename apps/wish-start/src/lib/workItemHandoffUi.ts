import { api } from "@wish/convex-backend/api";
import type { FunctionReturnType } from "convex/server";

export function getWorkItemHandoffAction(
  surface: FunctionReturnType<typeof api.workItemHandoffs.getSurface>,
) {
  if (surface.handoff?.lifecycle.state === "succeeded") return "open" as const;
  if (!surface.connection) return "connect" as const;
  if (surface.connection.health !== "active") return "fix" as const;
  if (
    surface.handoff?.lifecycle.state === "pending" ||
    surface.handoff?.lifecycle.state === "unknown"
  ) {
    return "checking" as const;
  }
  if (surface.handoff?.lifecycle.state === "failed") return "retry" as const;
  return "send" as const;
}
