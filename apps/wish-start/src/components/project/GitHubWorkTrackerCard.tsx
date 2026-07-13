"use client";

import { useAsyncAction } from "#/hooks/useAsyncAction";
import { api } from "@wish/convex-backend/api";
import type { Id } from "@wish/convex-backend/data-model";
import { useAction, useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { AlertTriangle, Check, Github } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getInitialGitHubRepositoryId } from "@/lib/githubWorkTrackerUi";
import { getWorkTrackerCallbackMessage } from "@/lib/workTrackerCallbackUi";
import { getWorkTrackerError } from "@/lib/workTrackerErrors";

import {
  WorkTrackerCallbackAlert,
  WorkTrackerCard,
  WorkTrackerCleanupAlert,
  WorkTrackerConnectionActions,
  WorkTrackerConnectionFact,
  WorkTrackerConfigurationAlert,
  WorkTrackerDestinationEditor,
  WorkTrackerSetupFlow,
  WorkTrackerSetupStep,
} from "./WorkTrackerSetup";

function errorMessage(error: unknown, fallback: string) {
  return getWorkTrackerError(error)?.message ??
    (error instanceof Error && error.message ? error.message : fallback);
}

export default function GitHubWorkTrackerCard({
  githubResult,
  projectId,
}: {
  githubResult?: string;
  projectId: Id<"projects">;
}) {
  const settings = useQuery(api.githubWorkTrackerSettings.getGitHubSettings, { projectId });
  const beginGitHubSetup = useAction(api.githubWorkTrackerOAuth.beginGitHubSetup);
  const discardGitHubSetup = useMutation(api.githubWorkTrackerOAuth.discardGitHubSetup);
  const selectGitHubRepository = useAction(
    api.githubWorkTrackerConnections.selectGitHubRepository,
  );
  const listGitHubRepositories = useAction(
    api.githubWorkTrackerConnections.listGitHubRepositories,
  );
  const changeGitHubRepository = useAction(
    api.githubWorkTrackerConnections.changeGitHubRepository,
  );
  const disconnectGitHub = useMutation(api.githubWorkTrackerConnections.disconnectGitHub);
  const connectionAction = useAsyncAction();
  const repositoryAction = useAsyncAction();
  const [availableRepositories, setAvailableRepositories] = useState<Awaited<
    ReturnType<typeof listGitHubRepositories>
  > | null>(null);
  const [repositoryId, setRepositoryId] = useState("");
  const busy = connectionAction.isLoading || repositoryAction.isLoading;

  async function startSetup(setupId?: Id<"workTrackerOAuthSetups">) {
    await connectionAction.execute(async () => {
      try {
        if (setupId) await discardGitHubSetup({ projectId, setupId });
        const result = await beginGitHubSetup({ projectId });
        window.location.assign(result.authorizationUrl);
      } catch (error) {
        toast.error(errorMessage(error, "Could not start GitHub authorization"));
      }
    });
  }

  async function discardSetup(setupId: Id<"workTrackerOAuthSetups">) {
    await connectionAction.execute(async () => {
      try {
        await discardGitHubSetup({ projectId, setupId });
        toast.success("GitHub authorization discarded");
      } catch (error) {
        toast.error(errorMessage(error, "Could not discard GitHub authorization"));
      }
    });
  }

  async function loadRepositories() {
    await repositoryAction.execute(async () => {
      try {
        const repositories = await listGitHubRepositories({ projectId });
        setAvailableRepositories(repositories);
        setRepositoryId(
          getInitialGitHubRepositoryId(
            repositories,
            settings?.connection?.repository.id,
          ),
        );
      } catch (error) {
        toast.error(errorMessage(error, "Could not load GitHub repositories"));
      }
    });
  }

  async function saveRepository() {
    if (!repositoryId) return;
    await repositoryAction.execute(async () => {
      try {
        const result = await changeGitHubRepository({ projectId, repositoryId });
        setAvailableRepositories(null);
        toast.success(`GitHub destination changed to ${result.repository.fullName}`);
      } catch (error) {
        toast.error(errorMessage(error, "Could not change the GitHub repository"));
      }
    });
  }

  async function disconnect() {
    await connectionAction.execute(async () => {
      try {
        await disconnectGitHub({ projectId });
        setAvailableRepositories(null);
        toast.success("GitHub disconnected");
      } catch (error) {
        toast.error(errorMessage(error, "Could not disconnect GitHub"));
      }
    });
  }

  const callbackMessage = getWorkTrackerCallbackMessage("github", githubResult);
  const showCallbackMessage =
    callbackMessage && (!callbackMessage.successful || Boolean(settings?.setup));

  return (
    <div className="space-y-5">
      {showCallbackMessage ? (
        <WorkTrackerCallbackAlert {...callbackMessage} />
      ) : null}

      {settings && !settings.configured ? (
        <WorkTrackerConfigurationAlert
          provider="GitHub"
          description="A deployment administrator must configure the GitHub App before Project Owners can use this connection."
        />
      ) : null}

      {settings?.cleanupSetupId ? (
        <WorkTrackerCleanupAlert
          busy={busy}
          title="An incomplete GitHub authorization remains"
          description="No active connection was changed. Discard the incomplete setup before retrying."
          onDiscard={() => void discardSetup(settings.cleanupSetupId!)}
        />
      ) : null}

      <WorkTrackerCard
        title="GitHub Issues"
        description="One installation and one repository for this Project Board."
        icon={<Github className="size-5" />}
        loading={settings === undefined}
        configured={settings?.configured ?? false}
        connectionHealth={
          settings?.connection?.health === "active"
            ? "active"
            : settings?.connection
              ? "attention"
              : undefined
        }
        unavailableText="GitHub authorization is unavailable until the deployment is configured."
        setupContent={
          settings?.setup ? (
            <AuthorizedGitHubSetup
              key={settings.setup.id}
              setup={settings.setup}
              isSaving={busy}
              onCancel={() => void discardSetup(settings.setup!.id)}
              onStartAgain={() => void startSetup(settings.setup!.id)}
              onSave={async (selectedRepositoryId) => {
                await connectionAction.execute(async () => {
                  try {
                    const result = await selectGitHubRepository({
                      projectId,
                      setupId: settings.setup!.id,
                      repositoryId: selectedRepositoryId,
                    });
                    toast.success(`GitHub connected to ${result.repository.fullName}`);
                  } catch (error) {
                    toast.error(errorMessage(error, "Could not save the GitHub destination"));
                  }
                });
              }}
            />
          ) : undefined
        }
        connectedContent={
          settings?.connection ? (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <WorkTrackerConnectionFact
                  label="GitHub account"
                  value={settings.connection.accountLogin}
                />
                <WorkTrackerConnectionFact
                  label="Destination repository"
                  value={settings.connection.repository.fullName}
                />
              </div>

              {availableRepositories ? (
                <WorkTrackerDestinationEditor
                  title="Change destination repository"
                  description="This affects future sends only. Existing GitHub links do not move."
                  saveLabel="Save repository"
                  saveDisabled={!repositoryId}
                  busy={busy}
                  onSave={() => void saveRepository()}
                  onCancel={() => setAvailableRepositories(null)}
                >
                    <RepositorySelect
                      repositories={availableRepositories}
                      repositoryId={repositoryId}
                      onValueChange={setRepositoryId}
                    />
                </WorkTrackerDestinationEditor>
              ) : null}

              <WorkTrackerConnectionActions
                provider="GitHub"
                busy={busy}
                changeLabel="Change repository"
                connectLabel="Connect another installation"
                disconnectLabel="Disconnect GitHub"
                disconnectDescription="Wish removes only this local connection. The GitHub App stays installed and historical issue links remain available."
                onChange={() => void loadRepositories()}
                onConnect={() => void startSetup()}
                onDisconnect={() => void disconnect()}
              />
            </div>
          ) : undefined
        }
        disconnectedContent={
          <WorkTrackerSetupFlow
            firstTitle="Install the GitHub App"
            firstDescription="Grant Wish issue access to the repositories you choose."
            action={
              <Button type="button" disabled={busy} onClick={() => void startSetup()}>
                <Github /> Install GitHub App
              </Button>
            }
            secondTitle="Choose a repository"
            secondDescription="After installation, choose exactly one repository for future sends."
          />
        }
      />
    </div>
  );
}

function AuthorizedGitHubSetup({
  isSaving,
  onCancel,
  onSave,
  onStartAgain,
  setup,
}: {
  isSaving: boolean;
  onCancel: () => void;
  onSave: (repositoryId: string) => Promise<void>;
  onStartAgain: () => void;
  setup: NonNullable<
    FunctionReturnType<typeof api.githubWorkTrackerSettings.getGitHubSettings>["setup"]
  >;
}) {
  const [repositoryId, setRepositoryId] = useState(
    setup.repositories.length === 1 ? setup.repositories[0].id : "",
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
        <WorkTrackerSetupStep number="1" title="GitHub authorized" complete>
          {setup.accountLogin} granted access. Temporary user credentials were revoked.
        </WorkTrackerSetupStep>
        <div className="hidden items-center text-muted-foreground sm:flex">→</div>
        <WorkTrackerSetupStep number="2" title="Choose a repository" active>
          {setup.repositories.length > 0
            ? "Select the repository that should receive future External Work Items."
            : "This installation does not expose an available issue repository to Wish."}
        </WorkTrackerSetupStep>
      </div>

      {setup.replacesInstallation ? (
        <Alert>
          <AlertTriangle />
          <AlertTitle>This replaces the connected installation</AlertTitle>
          <AlertDescription>
            Historical issue links remain unchanged. Only future sends use the new installation.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/20 p-4">
        {setup.repositories.length > 0 ? (
          <RepositorySelect
            repositories={setup.repositories}
            repositoryId={repositoryId}
            onValueChange={setRepositoryId}
          />
        ) : null}
        <Button
          type="button"
          disabled={!repositoryId || isSaving}
          onClick={() => void onSave(repositoryId)}
        >
          <Check /> Save destination
        </Button>
        <Button type="button" variant="ghost" disabled={isSaving} onClick={onCancel}>
          Cancel setup
        </Button>
        <Button type="button" variant="ghost" disabled={isSaving} onClick={onStartAgain}>
          Start again
        </Button>
      </div>
    </div>
  );
}

function RepositorySelect({
  onValueChange,
  repositories,
  repositoryId,
}: {
  onValueChange: (value: string) => void;
  repositories: { id: string; fullName: string }[];
  repositoryId: string;
}) {
  return (
    <Select value={repositoryId} onValueChange={onValueChange}>
      <SelectTrigger className="min-w-72" aria-label="GitHub destination repository">
        <SelectValue placeholder="Choose a GitHub repository" />
      </SelectTrigger>
      <SelectContent>
        {repositories.map((repository) => (
          <SelectItem key={repository.id} value={repository.id}>
            {repository.fullName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
