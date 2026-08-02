import { ConvexError } from "convex/values";

import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { getFreshLinearConnection } from "../workTrackerConnections";

import { getLinearConfig, isLinearHandoffCreationEnabled } from "./linearConnection";
import { buildLinearIssueDescription, buildWishSourceUrl, createLinearIssue } from "./linearIssue";
import { getRequestKind } from "./requestKind";
import {
  handoffCreationDisabledError,
  workTrackerConnectionNeedsAttentionError,
} from "./workTrackerErrors";

export async function sendLinearHandoff(
  ctx: ActionCtx,
  args: { projectId: Id<"projects">; requestId: Id<"requests"> },
): Promise<Doc<"workItemHandoffs">> {
  let handoff: Doc<"workItemHandoffs"> | null = await ctx.runQuery(
    internal.workItemHandoffs.getOwnedInternal,
    {
      ...args,
      provider: "linear",
    },
  );
  if (handoff?.lifecycle.state === "pending") {
    await ctx.runMutation(internal.workItemHandoffs.expirePendingInternal, {
      handoffId: handoff._id,
      attemptCount: handoff.attemptCount,
    });
    handoff = await ctx.runQuery(internal.workItemHandoffs.getOwnedInternal, {
      ...args,
      provider: "linear",
    });
  }
  if (handoff && handoff.lifecycle.state !== "failed") return handoff;
  if (!isLinearHandoffCreationEnabled()) {
    throw new ConvexError(handoffCreationDisabledError);
  }

  const config = getLinearConfig();
  const currentConnection = await ctx.runQuery(
    internal.workTrackerConnections.getLinearConnectionForActionInternal,
    { projectId: args.projectId },
  );
  if (!currentConnection || currentConnection.health !== "active") {
    throw new ConvexError(workTrackerConnectionNeedsAttentionError);
  }

  const reservation: {
    handoff: Doc<"workItemHandoffs">;
    shouldSend: boolean;
    project: Doc<"projects">;
    request: Doc<"requests">;
  } = await ctx.runMutation(internal.workItemHandoffs.reserveInternal, {
    ...args,
    provider: "linear",
    connectionId: currentConnection._id,
    connectionUpdatedAt: currentConnection.updatedAt,
    recovery: { provider: "linear", issueId: crypto.randomUUID() },
  });
  if (!reservation.shouldSend) return reservation.handoff;

  let freshConnection: Awaited<ReturnType<typeof getFreshLinearConnection>> | undefined;
  try {
    freshConnection = await getFreshLinearConnection(ctx, args.projectId);
  } catch {
    // The stable failure is persisted below.
  }
  if (
    !freshConnection ||
    freshConnection.connection._id !== currentConnection._id ||
    freshConnection.connection.health !== "active"
  ) {
    await ctx.runMutation(internal.workItemHandoffs.completeFailedInternal, {
      handoffId: reservation.handoff._id,
      attemptCount: reservation.handoff.attemptCount,
      errorCode: "linear_connection_unavailable",
      errorMessage: "Linear connection is unavailable",
    });
    console.info("work_item_handoff_delivery", {
      provider: "linear",
      handoffId: reservation.handoff._id,
      state: "failed",
      errorCode: "linear_connection_unavailable",
    });
    const failed = await ctx.runQuery(internal.workItemHandoffs.getOwnedInternal, {
      ...args,
      provider: "linear",
    });
    if (!failed) throw new Error("Work Item Handoff was not saved");
    return failed;
  }
  const { connection, credentials } = freshConnection;

  const sourceUrl = buildWishSourceUrl(
    config.baseUrl,
    reservation.project._id,
    reservation.project.projectSlug,
    getRequestKind(reservation.request),
    reservation.request._id,
  );
  const result = await createLinearIssue({
    accessToken: credentials.accessToken,
    issueId: reservation.handoff.recovery.issueId,
    teamId: connection.data.teamId,
    title: reservation.request.text,
    description: buildLinearIssueDescription(reservation.request.description, sourceUrl),
  });
  console.info("work_item_handoff_delivery", {
    provider: "linear",
    handoffId: reservation.handoff._id,
    state: result.state,
    errorCode: result.state === "succeeded" ? undefined : result.errorCode,
    providerCorrelationId: result.state === "succeeded" ? undefined : result.providerCorrelationId,
  });

  if (result.needsAttention) {
    await ctx.runMutation(
      internal.workTrackerConnections.markLinearConnectionNeedsAttentionInternal,
      {
        connectionId: connection._id,
        credentialCiphertext: connection.data.encryptedCredentials.ciphertext,
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
    provider: "linear",
  });
  if (!saved) throw new Error("Work Item Handoff was not saved");
  return saved;
}
