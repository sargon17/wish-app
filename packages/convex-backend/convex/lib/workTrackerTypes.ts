import { v } from "convex/values";

export const workTrackerConnectionProviderValidator = v.union(
  v.literal("linear"),
  v.literal("github"),
);

export const workTrackerProviderValidator = v.literal("linear");

export const workTrackerConnectionHealthValidator = v.union(
  v.literal("active"),
  v.literal("needs_attention"),
);

const encryptedSecretValidator = v.object({
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

export const githubRepositoryValidator = v.object({
  id: v.string(),
  nodeId: v.string(),
  owner: v.string(),
  name: v.string(),
  fullName: v.string(),
  url: v.string(),
});

export const workTrackerConnectionDataValidator = v.union(
  v.object({
    provider: v.literal("linear"),
    organizationId: v.string(),
    organizationName: v.string(),
    organizationUrlKey: v.string(),
    teamId: v.string(),
    teamKey: v.string(),
    teamName: v.string(),
    encryptedCredentials: encryptedSecretValidator,
    credentialLease: v.optional(
      v.object({
        id: v.string(),
        expiresAt: v.number(),
      }),
    ),
    pendingRevocation: v.optional(
      v.object({
        encryptedCredentials: encryptedSecretValidator,
        retryAt: v.number(),
      }),
    ),
  }),
  v.object({
    provider: v.literal("github"),
    installationId: v.string(),
    accountLogin: v.string(),
    repository: githubRepositoryValidator,
  }),
);

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
    encryptedCredentials: encryptedSecretValidator,
  }),
  v.object({
    provider: v.literal("linear"),
    stage: v.literal("ready"),
    redirectUri: v.string(),
    encryptedCredentials: encryptedSecretValidator,
    authorization: v.object({
      organization: linearOrganizationValidator,
      teams: v.array(linearTeamValidator),
    }),
  }),
  v.object({
    provider: v.literal("linear"),
    stage: v.literal("discarding"),
    redirectUri: v.string(),
    encryptedCredentials: encryptedSecretValidator,
  }),
  v.object({
    provider: v.literal("github"),
    stage: v.literal("pending"),
    redirectUri: v.string(),
  }),
  v.object({
    provider: v.literal("github"),
    stage: v.literal("ready"),
    redirectUri: v.string(),
    installationId: v.string(),
    accountLogin: v.string(),
    repositories: v.array(githubRepositoryValidator),
  }),
  v.object({
    provider: v.literal("github"),
    stage: v.literal("discarding"),
    redirectUri: v.string(),
    encryptedUserCredentials: encryptedSecretValidator,
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
