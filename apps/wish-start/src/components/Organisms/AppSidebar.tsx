import { Link, useLocation, useParams, useRouter } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Cog,
  Home,
  LayoutDashboard,
  ListTodo,
  Mail,
  Plug,
  ScrollText,
} from "lucide-react";
import type { ReactNode } from "react";

import ProjectSettings from "@/components/project/ProjectSettings";
import { WorkTrackerCallbackAlert } from "@/components/project/WorkTrackerSetup";
import { parseGitHubCallbackResult } from "@/lib/githubWorkTrackerUi";
import { parseLinearCallbackResult } from "@/lib/linearWorkTrackerUi";
import {
  getWorkTrackerCallbackDismissUrl,
  getWorkTrackerCallbackMessage,
} from "@/lib/workTrackerCallbackUi";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

// Menu items.
const items = [
  {
    title: "Home",
    url: "/",
    icon: Home,
  },
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Stats",
    url: "/dashboard/stats",
    icon: BarChart3,
  },
  {
    title: "Waitlist",
    url: "/dashboard/waitlist",
    icon: Mail,
  },
  {
    title: "MCP connection",
    url: "/dashboard/mcp",
    icon: Plug,
  },
];

const projectViews = [
  { title: "Requests", to: "/dashboard/project/$projectId/$slug/requests", icon: ListTodo },
  {
    title: "Complaints",
    to: "/dashboard/project/$projectId/$slug/complaints",
    icon: AlertTriangle,
  },
  {
    title: "Changelog",
    to: "/dashboard/project/$projectId/$slug/changelog",
    icon: ScrollText,
  },
] as const;

interface Props {
  footer?: ReactNode;
}

export function AppSidebar({ footer }: Props) {
  const { projectId, slug } = useParams({ strict: false });
  const location = useLocation();
  const router = useRouter();
  const search = new URLSearchParams(location.searchStr);
  const githubResult = parseGitHubCallbackResult(search.get("github"));
  const linearResult = parseLinearCallbackResult(search.get("linear"));

  function clearCallbackResult(provider: "github" | "linear") {
    router.history.replace(
      getWorkTrackerCallbackDismissUrl(location.pathname, location.searchStr, provider),
    );
  }

  return (
    <Sidebar variant="floating" className="z-20">
      <SidebarContent>
        {projectId && slug ? (
          <ProjectNav
            projectId={projectId}
            slug={slug}
            requestedSettings={search.get("settings") === "work-trackers" ? "work-trackers" : undefined}
            githubResult={githubResult}
            linearResult={linearResult}
            onSettingsClose={() => {
              search.delete("settings");
              search.delete("github");
              search.delete("linear");
              const suffix = search.toString();
              router.history.replace(`${location.pathname}${suffix ? `?${suffix}` : ""}`);
            }}
          />
        ) : (
          <GlobalNav
            githubResult={githubResult}
            linearResult={linearResult}
            onDismiss={clearCallbackResult}
          />
        )}
      </SidebarContent>
      <SidebarFooter>{footer}</SidebarFooter>
    </Sidebar>
  );
}

function GlobalNav({
  githubResult,
  linearResult,
  onDismiss,
}: {
  githubResult?: string;
  linearResult?: string;
  onDismiss: (provider: "github" | "linear") => void;
}) {
  const githubMessage = getWorkTrackerCallbackMessage("github", githubResult);
  const linearMessage = getWorkTrackerCallbackMessage("linear", linearResult);

  return (
    <>
      {githubMessage || linearMessage ? (
        <SidebarGroup>
          <div className="space-y-2">
            {githubMessage ? (
              <WorkTrackerCallbackAlert
                {...githubMessage}
                onDismiss={() => onDismiss("github")}
              />
            ) : null}
            {linearMessage ? (
              <WorkTrackerCallbackAlert
                {...linearMessage}
                onDismiss={() => onDismiss("linear")}
              />
            ) : null}
          </div>
        </SidebarGroup>
      ) : null}
      <SidebarGroup>
        <SidebarGroupLabel>Wish App</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {items.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild>
                  <Link to={item.url}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </>
  );
}

function ProjectNav({
  githubResult,
  linearResult,
  onSettingsClose,
  projectId,
  requestedSettings,
  slug,
}: {
  githubResult?: string;
  linearResult?: string;
  onSettingsClose: () => void;
  projectId: string;
  requestedSettings?: string;
  slug: string;
}) {
  const { pathname } = useLocation();
  const base = `/dashboard/project/${projectId}/${slug}`;

  return (
    <>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link to="/dashboard">
                  <ArrowLeft />
                  <span>Back to dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
      <SidebarGroup>
        <SidebarGroupLabel className="capitalize">{slug.replaceAll("-", " ")}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {projectViews.map((view) => (
              <SidebarMenuItem key={view.title}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith(`${base}/${view.to.split("/").at(-1)}`)}
                >
                  <Link to={view.to} params={{ projectId, slug }}>
                    <view.icon />
                    <span>{view.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
            <SidebarMenuItem>
              <ProjectSettings
                projectID={projectId as never}
                requestedSection={requestedSettings}
                githubResult={githubResult}
                linearResult={linearResult}
                onUrlClose={onSettingsClose}
              >
                <SidebarMenuButton>
                  <Cog />
                  <span>Settings</span>
                </SidebarMenuButton>
              </ProjectSettings>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </>
  );
}
