"use client";

import { useLocation, useRouter } from "@tanstack/react-router";
import { api } from "@wish/convex-backend/api";
import type { Doc } from "@wish/convex-backend/data-model";
import { useAction, useQuery } from "convex/react";
import { ExternalLink, RefreshCw, Send, Settings2, Wrench } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { getWorkItemHandoffAction } from "@/lib/workItemHandoffUi";
import { getWorkTrackerError } from "@/lib/workTrackerErrors";

function errorMessage(error: unknown, fallback: string) {
  return getWorkTrackerError(error)?.message ?? fallback;
}

function showHandoffResult(handoff: Doc<"workItemHandoffs">) {
  if (handoff.lifecycle.state === "succeeded") {
    const issue = handoff.lifecycle.externalIdentity;
    toast.success("Linear issue ready", {
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
    toast.error(handoff.lifecycle.errorMessage);
    return;
  }
  if (handoff.lifecycle.state === "unknown") {
    toast.warning("Linear delivery is being checked", {
      description:
        "Wish will not send the issue twice while the outcome is uncertain.",
    });
    return;
  }
  toast.message("Creating Linear issue");
}

export default function WorkItemHandoffAction({
  request,
}: {
  request: Doc<"requests">;
}) {
  const provider = "linear" as const;
  const surface = useQuery(api.workItemHandoffs.getSurface, {
    projectId: request.project,
    requestId: request._id,
    provider,
  });
  const sendHandoff = useAction(api.workItemHandoffs.send);
  const checkHandoff = useAction(api.workItemHandoffs.check);
  const location = useLocation();
  const router = useRouter();
  const [working, setWorking] = useState(false);

  if (!surface) {
    return (
      <Button type="button" size="sm" variant="outline" disabled>
        <Spinner /> Loading Linear
      </Button>
    );
  }

  const action = getWorkItemHandoffAction(surface);
  const issue =
    surface.handoff?.lifecycle.state === "succeeded"
      ? surface.handoff.lifecycle.externalIdentity
      : undefined;

  function openSettings() {
    const search = new URLSearchParams(location.searchStr);
    search.set("settings", "work-trackers");
    router.history.push(`${location.pathname}?${search.toString()}`);
  }

  async function send() {
    setWorking(true);
    try {
      const result = await sendHandoff({
        projectId: request.project,
        requestId: request._id,
        provider,
      });
      showHandoffResult(result);
    } catch (error) {
      toast.error(errorMessage(error, "Could not send this item to Linear"));
    } finally {
      setWorking(false);
    }
  }

  async function check() {
    setWorking(true);
    try {
      const result = await checkHandoff({
        projectId: request.project,
        requestId: request._id,
        provider,
      });
      if (result) showHandoffResult(result);
    } catch (error) {
      toast.error(errorMessage(error, "Could not check the Linear issue"));
    } finally {
      setWorking(false);
    }
  }

  if (action === "open" && issue) {
    return (
      <Button size="sm" variant="outline" asChild>
        <a href={issue.url} target="_blank" rel="noreferrer">
          {issue.identifier} <ExternalLink />
        </a>
      </Button>
    );
  }

  if (action === "connect" || action === "fix") {
    return (
      <Button type="button" size="sm" variant="outline" onClick={openSettings}>
        {action === "connect" ? <Settings2 /> : <Wrench />}
        {action === "connect" ? "Connect Linear" : "Fix Linear"}
      </Button>
    );
  }

  if (action === "checking") {
    const pending = surface.handoff?.lifecycle.state === "pending";
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={working || pending}
        onClick={() => void check()}
      >
        {working || pending ? <Spinner /> : <RefreshCw />}
        {working || pending ? "Checking Linear" : "Check Linear"}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      disabled={working}
      onClick={() => void send()}
    >
      {working ? <Spinner /> : <Send />}
      {working
        ? "Sending"
        : action === "retry"
          ? "Retry Linear"
          : "Send to Linear"}
    </Button>
  );
}
