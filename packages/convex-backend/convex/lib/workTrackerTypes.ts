import { v } from "convex/values";

export const workTrackerProviderValidator = v.literal("linear");

export const workTrackerConnectionHealthValidator = v.union(
  v.literal("active"),
  v.literal("needs_attention"),
);

const encryptedCredentialsValidator = v.object({
  ciphertext: v.string(),
  iv: v.string(),
});

export const workTrackerConnectionDataValidator = v.object({
  provider: v.literal("linear"),
  organizationId: v.string(),
  organizationName: v.string(),
  teamId: v.string(),
  teamName: v.string(),
  encryptedCredentials: encryptedCredentialsValidator,
});

export const workTrackerOAuthSetupDataValidator = v.object({
  provider: v.literal("linear"),
  authorization: v.optional(
    v.object({
      encryptedCredentials: encryptedCredentialsValidator,
    }),
  ),
});

export const workItemHandoffRecoveryValidator = v.object({
  provider: v.literal("linear"),
  issueId: v.string(),
});

export const externalWorkItemIdentityValidator = v.object({
  provider: v.literal("linear"),
  id: v.string(),
  identifier: v.string(),
  url: v.string(),
});

const handoffErrorFields = {
  errorCode: v.optional(v.string()),
  errorMessage: v.optional(v.string()),
  providerCorrelationId: v.optional(v.string()),
};

export const workItemHandoffLifecycleValidator = v.union(
  v.object({
    state: v.literal("pending"),
    leaseExpiresAt: v.number(),
  }),
  v.object({
    state: v.literal("succeeded"),
    externalIdentity: externalWorkItemIdentityValidator,
    succeededAt: v.number(),
  }),
  v.object({
    state: v.literal("failed"),
    ...handoffErrorFields,
  }),
  v.object({
    state: v.literal("unknown"),
    ...handoffErrorFields,
  }),
);
