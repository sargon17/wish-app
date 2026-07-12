import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { FunctionReference } from "convex/server";
import type { ActionCtx } from "../_generated/server";
import { api } from "../_generated/api";
import { z } from "zod/v3";

const actions = {
  list_projects: ["query", api.projects.getProjectsForUser],
  get_project: ["query", api.projects.getProjectById],
  create_project: ["mutation", api.projects.createProject],
  update_project: ["mutation", api.projects.updateProject],
  delete_project: ["mutation", api.projects.deleteProject],
  publish_suggestion_portal: ["mutation", api.projects.publishSuggestionPortal],
  unpublish_suggestion_portal: ["mutation", api.projects.unpublishSuggestionPortal],
  ensure_public_changelog_slug: ["mutation", api.projects.ensurePublicChangelogSlug],
  list_requests: ["query", api.requests.getByProject],
  create_request: ["mutation", api.requests.create],
  edit_request: ["mutation", api.requests.edit],
  update_request_status: ["mutation", api.requests.updateStatus],
  delete_request: ["mutation", api.requests.deleteRequest],
  list_comments: ["query", api.requestComments.listByRequest],
  create_comment: ["mutation", api.requestComments.create],
  delete_comment: ["mutation", api.requestComments.remove],
  delete_comment_by_client: ["mutation", api.requestComments.deleteByClient],
  toggle_upvote: ["mutation", api.requestUpvotes.toggle],
  list_viewer_upvotes: ["query", api.requestUpvotes.getViewerUpvotesByProject],
  list_statuses: ["query", api.requestStatuses.getManagementByProject],
  create_status: ["mutation", api.requestStatuses.create],
  update_status: ["mutation", api.requestStatuses.update],
  reorder_statuses: ["mutation", api.requestStatuses.reorder],
  delete_status: ["mutation", api.requestStatuses.remove],
  update_status_color: ["mutation", api.requestStatuses.updateColor],
  repair_status_defaults: ["mutation", api.requestStatuses.repairProjectDefaults],
  list_changelog_entries: ["query", api.changelogEntries.listByProject],
  create_changelog_entry: ["mutation", api.changelogEntries.create],
  save_changelog_entry: ["mutation", api.changelogEntries.save],
  publish_changelog_entry: ["mutation", api.changelogEntries.publish],
  unpublish_changelog_entry: ["mutation", api.changelogEntries.unpublish],
  delete_changelog_draft: ["mutation", api.changelogEntries.deleteDraft],
  list_notification_connectors: ["query", api.notificationConnectors.listByProject],
  create_telegram_connection_token: [
    "mutation",
    api.notificationConnectors.createTelegramConnectionToken,
  ],
  set_telegram_enabled: ["mutation", api.notificationConnectors.setTelegramEnabled],
  list_api_keys: ["query", api.apiKeys.listByProject],
  create_api_key: ["mutation", api.apiKeys.create],
  revoke_api_key: ["mutation", api.apiKeys.revoke],
  request_overview: ["query", api.stats.requestOverview],
} as const;

type ActionName = keyof typeof actions;

function text(value: unknown) {
  return {
    content: [{ type: "text" as const, text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }],
  };
}

export async function handleMcpRequest(ctx: ActionCtx, request: Request) {
  const server = new McpServer({ name: "wish-app", version: "0.2.0" });
  const actionSchema = z.string().refine((action): action is ActionName => action in actions);
  const registerAdminTool = server.registerTool.bind(server) as (
    name: string,
    config: { description: string; inputSchema: Record<string, unknown> },
    handler: (args: { action: ActionName; args: Record<string, unknown> }) => Promise<ReturnType<typeof text>>,
  ) => void;

  server.registerTool(
    "list_admin_actions",
    { description: "List Wish admin MCP actions.", inputSchema: {} },
    async () => text(Object.keys(actions)),
  );
  registerAdminTool(
    "wish_admin",
    {
      description: "Run a whitelisted Wish admin action. Args match the Convex function args.",
      inputSchema: {
        action: actionSchema,
        args: z.record(z.string(), z.unknown()).default({}),
      },
    },
    async ({ action, args }) => {
      try {
        const [kind, fn] = actions[action];
        const result =
          kind === "query"
            ? await ctx.runQuery(fn as FunctionReference<"query">, args)
            : await ctx.runMutation(fn as FunctionReference<"mutation">, args);

        return text(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`wish_admin failed for "${action}": ${message}`);
      }
    },
  );

  const transport = new WebStandardStreamableHTTPServerTransport({
    enableJsonResponse: true,
    sessionIdGenerator: undefined,
  });

  await server.connect(transport);
  return await transport.handleRequest(request);
}
