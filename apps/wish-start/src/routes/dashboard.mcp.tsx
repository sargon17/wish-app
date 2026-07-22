import DashboardPage from "@components/dashboard/DashboardPage";
import { createFileRoute } from "@tanstack/react-router";

import McpConnectionView from "@/components/mcp/McpConnectionView";

export const Route = createFileRoute("/dashboard/mcp")({ component: McpPage });

function McpPage() {
  return (
    <DashboardPage
      title="MCP connection"
      breadcrumbs={[
        { label: "dashboard", url: "/dashboard" },
        { label: "mcp", url: "/dashboard/mcp" },
      ]}
    >
      <McpConnectionView />
    </DashboardPage>
  );
}
