"use client";

import { useAsyncAction } from "#/hooks/useAsyncAction";
import { api } from "@wish/convex-backend/api";
import type { Id } from "@wish/convex-backend/data-model";
import { useAction, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { AlertTriangle, Check, ChartNoAxesGantt, Link2 } from "lucide-react";
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
import { getInitialLinearTeamId } from "@/lib/linearWorkTrackerUi";
import { getWorkTrackerCallbackMessage } from "@/lib/workTrackerCallbackUi";
import { getWorkTrackerError } from "@/lib/workTrackerErrors";

import {
  WorkTrackerCallbackAlert,
  WorkTrackerCard,
  WorkTrackerCleanupAlert,
  WorkTrackerConnectionFact,
  WorkTrackerConnectionActions,
  WorkTrackerConfigurationAlert,
  WorkTrackerDestinationEditor,
  WorkTrackerSetupFlow,
  WorkTrackerSetupStep,
} from "./WorkTrackerSetup";

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function workTrackerChangeError(error: unknown, fallback: string) {
  return getWorkTrackerError(error)?.message ?? errorMessage(error, fallback);
}

export default function LinearWorkTrackerCard({
  linearResult,
  projectId,
}: {
  linearResult?: string;
  projectId: Id<"projects">;
}) {
  const settings = useQuery(api.linearWorkTrackerSettings.getLinearSettings, { projectId });
  const beginLinearOAuth = useAction(api.linearWorkTrackerOAuth.beginLinearOAuth);
  const selectLinearTeam = useAction(api.workTrackerConnections.selectLinearTeam);
  const discardLinearOAuthSetup = useAction(
    api.linearWorkTrackerOAuth.discardLinearOAuthSetup,
  );
  const listLinearTeams = useAction(api.workTrackerConnections.listLinearTeams);
  const changeLinearTeam = useAction(api.workTrackerConnections.changeLinearTeam);
  const disconnectLinear = useAction(api.workTrackerConnections.disconnectLinear);
  const connectAction = useAsyncAction();
  const disconnectAction = useAsyncAction();
  const [availableTeams, setAvailableTeams] = useState<Awaited<
    ReturnType<typeof listLinearTeams>
  > | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const teamAction = useAsyncAction();
  const connectionBusy =
    connectAction.isLoading || disconnectAction.isLoading || teamAction.isLoading;

  async function startAuthorization(promptForWorkspace = false, setupId?: Id<"workTrackerOAuthSetups">) {
    await connectAction.execute(async () => {
      try {
        if (setupId) {
          await discardLinearOAuthSetup({ projectId, setupId });
        }
        const result = await beginLinearOAuth({ projectId, promptForWorkspace });
        window.location.assign(result.authorizationUrl);
      } catch (error) {
        toast.error(errorMessage(error, "Could not start Linear authorization"));
      }
    });
  }

  async function cancelAuthorization(setupId: Id<"workTrackerOAuthSetups">) {
    await connectAction.execute(async () => {
      try {
        await discardLinearOAuthSetup({ projectId, setupId });
        toast.success("Linear authorization discarded");
      } catch (error) {
        toast.error(errorMessage(error, "Could not discard the Linear authorization"));
      }
    });
  }

  async function loadTeams() {
    await teamAction.execute(async () => {
      try {
        const teams = await listLinearTeams({ projectId });
        setAvailableTeams(teams);
        setSelectedTeamId(getInitialLinearTeamId(teams, settings?.connection?.team.id));
      } catch (error) {
        toast.error(errorMessage(error, "Could not load Linear teams"));
      }
    });
  }

  async function saveTeam() {
    if (!selectedTeamId) return;
    await teamAction.execute(async () => {
      try {
        const result = await changeLinearTeam({ projectId, teamId: selectedTeamId });
        setAvailableTeams(null);
        toast.success(`Linear destination changed to ${result.team.name}`);
      } catch (error) {
        toast.error(workTrackerChangeError(error, "Could not change the Linear team"));
      }
    });
  }

  async function disconnect() {
    await disconnectAction.execute(async () => {
      try {
        await disconnectLinear({ projectId });
        setAvailableTeams(null);
        toast.success("Linear disconnected");
      } catch (error) {
        toast.error(workTrackerChangeError(error, "Could not disconnect Linear"));
      }
    });
  }

  const callbackMessage = getWorkTrackerCallbackMessage("linear", linearResult);
  const showCallbackMessage =
    callbackMessage && (!callbackMessage.successful || Boolean(settings?.setup));

  return (
    <div className="space-y-5">
      {showCallbackMessage ? (
        <WorkTrackerCallbackAlert {...callbackMessage} />
      ) : null}

      {settings && !settings.configured ? (
        <WorkTrackerConfigurationAlert
          provider="Linear"
          description="A deployment administrator must configure Linear OAuth before Project Owners can use this connection."
        />
      ) : null}

      {settings?.cleanupSetupId ? (
        <WorkTrackerCleanupAlert
          busy={connectionBusy}
          title="A failed Linear authorization still needs cleanup"
          description="No active connection was changed. Revoke the failed authorization before retrying."
          onDiscard={() => void cancelAuthorization(settings.cleanupSetupId!)}
        />
      ) : null}

      <WorkTrackerCard
        title="Linear"
        description="One workspace and one destination team for this Project Board."
        icon={<ChartNoAxesGantt className="size-5" />}
        loading={settings === undefined}
        configured={settings?.configured ?? false}
        connectionHealth={
          settings?.connection?.health === "active"
            ? "active"
            : settings?.connection
              ? "attention"
              : undefined
        }
        unavailableText="Linear authorization is unavailable until the deployment is configured."
        setupContent={
          settings?.setup ? (
            <AuthorizedLinearSetup
              key={settings.setup.id}
              setup={settings.setup}
              isSaving={connectionBusy}
              onCancel={() => void cancelAuthorization(settings.setup!.id)}
              onStartAgain={() => void startAuthorization(true, settings.setup!.id)}
              onSave={async (teamId) => {
                await connectAction.execute(async () => {
                  try {
                    const result = await selectLinearTeam({
                      projectId,
                      setupId: settings.setup!.id,
                      teamId,
                    });
                    toast.success(`Linear connected to ${result.team.name}`);
                  } catch (error) {
                    toast.error(workTrackerChangeError(error, "Could not save the Linear destination"));
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
                  label="Workspace"
                  value={settings.connection.organization.name}
                />
                <WorkTrackerConnectionFact
                  label="Destination team"
                  value={`${settings.connection.team.name} · ${settings.connection.team.key}`}
                />
              </div>

              {availableTeams ? (
                <WorkTrackerDestinationEditor
                  title="Change destination team"
                  description="This affects future sends only. Existing Linear links do not move."
                  saveLabel="Save team"
                  saveDisabled={!selectedTeamId}
                  busy={connectionBusy}
                  onSave={() => void saveTeam()}
                  onCancel={() => setAvailableTeams(null)}
                >
                    <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                      <SelectTrigger className="min-w-64" aria-label="Linear destination team">
                        <SelectValue placeholder="Choose a team" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTeams.map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name} · {team.key}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                </WorkTrackerDestinationEditor>
              ) : null}

              <WorkTrackerConnectionActions
                provider="Linear"
                busy={connectionBusy}
                changeLabel="Change team"
                connectLabel="Connect another workspace"
                disconnectLabel="Disconnect Linear"
                disconnectDescription="Wish will revoke its Linear access. Historical External Work Item links stay available, and Linear issues are never deleted."
                onChange={() => void loadTeams()}
                onConnect={() => void startAuthorization(true)}
                onDisconnect={() => void disconnect()}
              />
            </div>
          ) : undefined
        }
        disconnectedContent={
          <WorkTrackerSetupFlow
            firstTitle="Authorize Linear"
            firstDescription="A Linear workspace admin grants Wish read and issue-creation access."
            action={
              <Button
                type="button"
                disabled={connectionBusy}
                onClick={() => void startAuthorization()}
              >
                <Link2 /> Authorize Linear
              </Button>
            }
            secondTitle="Choose a team"
            secondDescription="After authorization, choose exactly one destination team for future sends."
          />
        }
      />
    </div>
  );
}

function AuthorizedLinearSetup({
  isSaving,
  onCancel,
  onStartAgain,
  onSave,
  setup,
}: {
  isSaving: boolean;
  onCancel: () => void;
  onStartAgain: () => void;
  onSave: (teamId: string) => Promise<void>;
  setup: NonNullable<
    FunctionReturnType<typeof api.linearWorkTrackerSettings.getLinearSettings>["setup"]
  >;
}) {
  const [teamId, setTeamId] = useState(setup.teams.length === 1 ? setup.teams[0].id : "");

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
        <WorkTrackerSetupStep number="1" title="Linear authorized" complete>
          {setup.organization.name} granted access. Credentials stay encrypted in Wish.
        </WorkTrackerSetupStep>
        <div className="hidden items-center text-muted-foreground sm:flex">→</div>
        <WorkTrackerSetupStep number="2" title="Choose a team" active>
          {setup.teams.length > 0
            ? "Select the Linear team that should receive future External Work Items."
            : "This installation does not expose any teams to Wish."}
        </WorkTrackerSetupStep>
      </div>

      {setup.replacesWorkspace ? (
        <Alert>
          <AlertTriangle />
          <AlertTitle>This replaces the connected workspace</AlertTitle>
          <AlertDescription>
            Historical issue links remain unchanged. Only future sends use the new workspace.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/20 p-4">
        {setup.teams.length > 0 ? (
          <Select value={teamId} onValueChange={setTeamId}>
            <SelectTrigger className="min-w-64" aria-label="Linear destination team">
              <SelectValue placeholder="Choose a Linear team" />
            </SelectTrigger>
            <SelectContent>
              {setup.teams.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name} · {team.key}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        <Button type="button" disabled={!teamId || isSaving} onClick={() => void onSave(teamId)}>
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
