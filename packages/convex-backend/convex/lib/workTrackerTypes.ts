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

const linearOrganizationValidator = v.object({
  id: v.string(),
  name: v.string(),
  urlKey: v.string(),
});

const linearTeamValidator = v.object({
  id: v.string(),
  key: v.string(),
  name: v.string(),
});

export const workTrackerConnectionDataValidator = v.object({
  provider: v.literal("linear"),
  organizationId: v.string(),
  organizationName: v.string(),
  organizationUrlKey: v.string(),
  teamId: v.string(),
  teamKey: v.string(),
  teamName: v.string(),
  encryptedCredentials: encryptedCredentialsValidator,
  credentialLease: v.optional(
    v.object({
      id: v.string(),
      expiresAt: v.number(),
    }),
  ),
  pendingRevocation: v.optional(
    v.object({
      encryptedCredentials: encryptedCredentialsValidator,
      retryAt: v.number(),
    }),
  ),
});

export const workTrackerOAuthSetupDataValidator = v.union(
  v.object({
    provider: v.literal("linear"),
    stage: v.literal("pending"),
    redirectUri: v.string(),
  }),
  v.object({
    provider: v.literal("linear"),
    stage: v.literal("exchanged"),
    redirectUri: v.string(),
    encryptedCredentials: encryptedCredentialsValidator,
  }),
  v.object({
    provider: v.literal("linear"),
    stage: v.literal("ready"),
    redirectUri: v.string(),
    encryptedCredentials: encryptedCredentialsValidator,
    authorization: v.object({
      organization: linearOrganizationValidator,
      teams: v.array(linearTeamValidator),
    }),
  }),
  v.object({
    provider: v.literal("linear"),
    stage: v.literal("discarding"),
    redirectUri: v.string(),
    encryptedCredentials: encryptedCredentialsValidator,
  }),
);

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
