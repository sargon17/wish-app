import { ConvexError } from "convex/values";

import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";

import {
  createGitHubInstallationToken,
  GitHubInstallationTokenError,
} from "./githubApp";
import {
  getGitHubAppAuthConfig,
  isGitHubHandoffCreationEnabled,
} from "./githubConnection";
import { createGitHubIssue } from "./githubIssue";
import { getRequestKind } from "./requestKind";
import {
  buildWishSourceUrl,
  buildWorkItemDescription,
} from "./workItemHandoffPayload";
import { getWishAppBaseUrl } from "./workTrackerConfig";
import {
  handoffCreationDisabledError,
  workTrackerConnectionNeedsAttentionError,
} from "./workTrackerErrors";

export async function sendGitHubHandoff(
  ctx: ActionCtx,
  args: { projectId: Id<"projects">; requestId: Id<"requests"> },
): Promise<Doc<"workItemHandoffs">> {
  let handoff: Doc<"workItemHandoffs"> | null = await ctx.runQuery(
    internal.workItemHandoffs.getOwnedInternal,
    { ...args, provider: "github" },
  );
  if (handoff?.lifecycle.state === "pending") {
    await ctx.runMutation(internal.workItemHandoffs.expirePendingInternal, {
      handoffId: handoff._id,
      attemptCount: handoff.attemptCount,
    });
    handoff = await ctx.runQuery(internal.workItemHandoffs.getOwnedInternal, {
      ...args,
      provider: "github",
    });
  }
  if (handoff && handoff.lifecycle.state !== "failed") return handoff;
  if (!isGitHubHandoffCreationEnabled()) {
    throw new ConvexError(handoffCreationDisabledError);
  }

  const context = await ctx.runQuery(
    internal.githubWorkItemHandoffs.getDeliveryContextInternal,
    { projectId: args.projectId, requestId: args.requestId },
  );
  if (!context.connection || context.connection.health !== "active") {
    throw new ConvexError(workTrackerConnectionNeedsAttentionError);
  }
  const sourceUrl = buildWishSourceUrl(
    getWishAppBaseUrl(),
    context.project._id,
    context.project.projectSlug,
    getRequestKind(context.request),
    context.request._id,
  );
  const repository = context.connection.data.repository;
  const reservation: {
    handoff: Doc<"workItemHandoffs">;
    shouldSend: boolean;
    project: Doc<"projects">;
    request: Doc<"requests">;
  } = await ctx.runMutation(internal.workItemHandoffs.reserveInternal, {
    ...args,
    provider: "github",
    connectionId: context.connection._id,
    connectionUpdatedAt: context.connection.updatedAt,
    recovery: {
      provider: "github",
      installationId: context.connection.data.installationId,
      repositoryId: repository.id,
      repositoryOwner: repository.owner,
      repositoryName: repository.name,
      sourceUrl,
      startedAt: Date.now(),
    },
  });
  if (!reservation.shouldSend || reservation.handoff.recovery.provider !== "github") {
    return reservation.handoff;
  }

  let accessToken: string;
  try {
    accessToken = await createGitHubInstallationToken({
      config: getGitHubAppAuthConfig(),
      installationId: reservation.handoff.recovery.installationId,
      repositoryIds: [reservation.handoff.recovery.repositoryId],
    });
  } catch (error) {
    if (error instanceof GitHubInstallationTokenError && error.needsAttention) {
      await ctx.runMutation(
        internal.githubWorkItemHandoffs.markConnectionNeedsAttentionInternal,
        {
          connectionId: context.connection._id,
          installationId: context.connection.data.installationId,
          repositoryId: repository.id,
        },
      );
    }
    await ctx.runMutation(internal.workItemHandoffs.completeFailedInternal, {
      handoffId: reservation.handoff._id,
      attemptCount: reservation.handoff.attemptCount,
      errorCode: "github_connection_unavailable",
      errorMessage: "GitHub connection is unavailable",
    });
    const failed = await ctx.runQuery(internal.workItemHandoffs.getOwnedInternal, {
      ...args,
      provider: "github",
    });
    if (!failed) throw new Error("Work Item Handoff was not saved");
    return failed;
  }

  const result = await createGitHubIssue({
    accessToken,
    repository: {
      id: reservation.handoff.recovery.repositoryId,
      owner: reservation.handoff.recovery.repositoryOwner,
      name: reservation.handoff.recovery.repositoryName,
    },
    title: reservation.request.text,
    body: buildWorkItemDescription(reservation.request.description, sourceUrl),
  });
  console.info("work_item_handoff_delivery", {
    provider: "github",
    handoffId: reservation.handoff._id,
    state: result.state,
    errorCode: result.state === "succeeded" ? undefined : result.errorCode,
    providerCorrelationId:
      result.state === "succeeded" ? undefined : result.providerCorrelationId,
  });

  if (result.needsAttention) {
    await ctx.runMutation(
      internal.githubWorkItemHandoffs.markConnectionNeedsAttentionInternal,
      {
        connectionId: context.connection._id,
        installationId: context.connection.data.installationId,
        repositoryId: repository.id,
      },
    );
  }
  if (result.state === "succeeded") {
    await ctx.runMutation(internal.workItemHandoffs.completeSucceededInternal, {
      handoffId: reservation.handoff._id,
      attemptCount: reservation.handoff.attemptCount,
      externalIdentity: result.externalIdentity,
    });
  } else if (result.state === "failed") {
    await ctx.runMutation(internal.workItemHandoffs.completeFailedInternal, {
      handoffId: reservation.handoff._id,
      attemptCount: reservation.handoff.attemptCount,
      errorCode: result.errorCode,
      errorMessage: result.errorMessage,
      providerCorrelationId: result.providerCorrelationId,
    });
  } else {
    await ctx.runMutation(internal.workItemHandoffs.completeUnknownInternal, {
      handoffId: reservation.handoff._id,
      attemptCount: reservation.handoff.attemptCount,
      errorCode: result.errorCode,
      errorMessage: result.errorMessage,
      providerCorrelationId: result.providerCorrelationId,
    });
  }

  const saved = await ctx.runQuery(internal.workItemHandoffs.getOwnedInternal, {
    ...args,
    provider: "github",
  });
  if (!saved) throw new Error("Work Item Handoff was not saved");
  return saved;
}
