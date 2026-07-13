"use client";

import { useLocation, useRouter } from "@tanstack/react-router";
import { api } from "@wish/convex-backend/api";
import type { Doc } from "@wish/convex-backend/data-model";
import { useAction, useQuery } from "convex/react";
import {
  ChartNoAxesGantt,
  ChevronDown,
  ExternalLink,
  Github,
  RefreshCw,
  Send,
  Settings2,
  Wrench,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { getWorkItemHandoffAction } from "@/lib/workItemHandoffUi";
import { getWorkTrackerError } from "@/lib/workTrackerErrors";

function providerDetails(provider: Doc<"workItemHandoffs">["provider"]) {
  switch (provider) {
    case "linear":
      return { label: "Linear", issueLabel: "Linear issue", Icon: ChartNoAxesGantt };
    case "github":
      return { label: "GitHub Issues", issueLabel: "GitHub issue", Icon: Github };
  }
}

function actionIcon(action: ReturnType<typeof getWorkItemHandoffAction>) {
  switch (action) {
    case "connect":
      return Settings2;
    case "fix":
      return Wrench;
    case "checking":
      return RefreshCw;
    case "open":
      return ExternalLink;
    case "retry":
    case "send":
      return Send;
  }
}

function showHandoffResult(handoff: Doc<"workItemHandoffs">) {
  const details = providerDetails(handoff.provider);
  if (handoff.lifecycle.state === "succeeded") {
    const issue = handoff.lifecycle.externalIdentity;
    toast.success(`${details.issueLabel} ready`, {
      description: (
        <a
          href={issue.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-medium text-orange-700 underline underline-offset-2 dark:text-orange-300"
        >
          {issue.identifier}
          <ExternalLink className="size-3" />
        </a>
      ),
    });
    return;
  }
  if (handoff.lifecycle.state === "failed") {
    toast.error(
      handoff.lifecycle.errorMessage ?? `Could not create the ${details.issueLabel}`,
    );
    return;
  }
  if (handoff.lifecycle.state === "unknown") {
    toast.warning(`${details.label} delivery is being checked`, {
      description: "Wish will not send the issue twice while the outcome is uncertain.",
    });
    return;
  }
  toast.message(`Creating ${details.issueLabel}`);
}

export default function WorkItemHandoffAction({
  request,
}: {
  request: Doc<"requests">;
}) {
  const location = useLocation();
  const router = useRouter();
  const [workingProviders, setWorkingProviders] = useState({
    github: false,
    linear: false,
  });

  function openSettings() {
    const search = new URLSearchParams(location.searchStr);
    search.set("settings", "work-trackers");
    router.history.push(`${location.pathname}?${search.toString()}`);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          <Send /> Work trackers <ChevronDown className="size-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>
          <span className="block">External work items</span>
          <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
            Choose exactly where to send this item.
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ProviderHandoffItem
          request={request}
          provider="linear"
          openSettings={openSettings}
          working={workingProviders.linear}
          onWorkingChange={(working) =>
            setWorkingProviders((current) => ({ ...current, linear: working }))
          }
        />
        <ProviderHandoffItem
          request={request}
          provider="github"
          openSettings={openSettings}
          working={workingProviders.github}
          onWorkingChange={(working) =>
            setWorkingProviders((current) => ({ ...current, github: working }))
          }
        />
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={openSettings}>
          <Settings2 /> Manage Work Trackers
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ProviderHandoffItem({
  onWorkingChange,
  openSettings,
  provider,
  request,
  working,
}: {
  onWorkingChange: (working: boolean) => void;
  openSettings: () => void;
  provider: Doc<"workItemHandoffs">["provider"];
  request: Doc<"requests">;
  working: boolean;
}) {
  const surface = useQuery(api.workItemHandoffs.getSurface, {
    projectId: request.project,
    requestId: request._id,
    provider,
  });
  const sendHandoff = useAction(api.workItemHandoffs.send);
  const checkHandoff = useAction(api.workItemHandoffs.check);
  const details = providerDetails(provider);

  if (!surface) {
    return (
      <DropdownMenuItem disabled className="py-2.5">
        <details.Icon />
        <span className="flex-1">Loading {details.label}</span>
        <Spinner />
      </DropdownMenuItem>
    );
  }

  const action = getWorkItemHandoffAction(surface);
  const issue =
    surface.handoff?.lifecycle.state === "succeeded"
      ? surface.handoff.lifecycle.externalIdentity
      : undefined;

  if (action === "open" && issue) {
    return (
      <DropdownMenuItem asChild className="py-2.5">
        <a href={issue.url} target="_blank" rel="noreferrer">
          <details.Icon />
          <span className="min-w-0 flex-1">
            <span className="block font-medium">{details.label}</span>
            <span className="block truncate text-xs text-muted-foreground">
              Open {issue.identifier}
            </span>
          </span>
          <ExternalLink />
        </a>
      </DropdownMenuItem>
    );
  }

  const pending = surface.handoff?.lifecycle.state === "pending";

  async function run() {
    if (action === "connect" || action === "fix") {
      openSettings();
      return;
    }
    if (working) return;
    onWorkingChange(true);
    try {
      const result =
        action === "checking"
          ? await checkHandoff({
              projectId: request.project,
              requestId: request._id,
              provider,
            })
          : await sendHandoff({
              projectId: request.project,
              requestId: request._id,
              provider,
            });
      if (result) showHandoffResult(result);
    } catch (error) {
      const message = getWorkTrackerError(error)?.message ??
        `Could not ${action === "checking" ? "check" : "send"} the ${details.issueLabel}`;
      toast.error(message);
    } finally {
      onWorkingChange(false);
    }
  }

  const description = (() => {
    switch (action) {
      case "connect":
        return "Connect this provider to send";
      case "fix":
        return "Connection needs attention";
      case "checking":
        return pending ? "Creation is in progress" : "Outcome uncertain — check now";
      case "retry":
        return "Previous attempt failed — retry";
      case "send":
        return `Send to ${surface.connection?.destinationLabel}`;
      case "open":
        return "Open external issue";
    }
  })();
  const StatusIcon = actionIcon(action);

  return (
    <DropdownMenuItem
      disabled={working || pending}
      className="py-2.5"
      onSelect={() => void run()}
    >
      <details.Icon />
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{details.label}</span>
        <span className="block truncate text-xs text-muted-foreground">{description}</span>
      </span>
      {working ? <Spinner /> : <StatusIcon />}
    </DropdownMenuItem>
  );
}
