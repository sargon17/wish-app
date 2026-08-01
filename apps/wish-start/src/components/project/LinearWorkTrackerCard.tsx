"use client";

import { useAsyncAction } from "#/hooks/useAsyncAction";
import { api } from "@wish/convex-backend/api";
import type { Id } from "@wish/convex-backend/data-model";
import { useAction, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import {
  AlertTriangle,
  Check,
  ChartNoAxesGantt,
  Link2,
  RefreshCw,
  Unplug,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { getInitialLinearTeamId, parseLinearCallbackResult } from "@/lib/linearWorkTrackerUi";

const callbackMessages = {
  authorized: {
    title: "Linear authorized",
    description: "Choose the team that should receive new External Work Items.",
  },
  invalid_callback: {
    title: "Linear did not complete authorization",
    description: "Start the connection again from this page.",
  },
  invalid_state: {
    title: "This Linear connection link expired",
    description: "OAuth links are single-use and expire after ten minutes. Start again.",
  },
  authorization_denied: {
    title: "Linear authorization was canceled",
    description: "No active connection was changed.",
  },
  linear_exchange_failed: {
    title: "Linear rejected the authorization exchange",
    description: "No active connection was changed. Start again or check the Linear app settings.",
  },
  linear_discovery_failed: {
    title: "Wish could not load Linear teams",
    description: "No active connection was changed. Reauthorize and try again.",
  },
  linear_persistence_failed: {
    title: "Wish could not save the Linear authorization",
    description: "The new authorization was revoked. Start again.",
  },
};

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
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
        toast.error(errorMessage(error, "Could not change the Linear team"));
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
        toast.error(errorMessage(error, "Could not disconnect Linear"));
      }
    });
  }

  const parsedLinearResult = parseLinearCallbackResult(linearResult);
  const callbackMessage = parsedLinearResult ? callbackMessages[parsedLinearResult] : null;
  const showCallbackMessage =
    callbackMessage && (parsedLinearResult !== "authorized" || Boolean(settings?.setup));

  return (
    <div className="space-y-5">
      {showCallbackMessage ? (
        <Alert variant={parsedLinearResult === "authorized" ? "default" : "destructive"}>
          {parsedLinearResult === "authorized" ? <Check /> : <AlertTriangle />}
          <AlertTitle>{callbackMessage.title}</AlertTitle>
          <AlertDescription>{callbackMessage.description}</AlertDescription>
        </Alert>
      ) : null}

      {settings && !settings.configured ? (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>Linear is not configured</AlertTitle>
          <AlertDescription>
            A deployment administrator must configure Linear OAuth before Project Owners can use
            this connection.
          </AlertDescription>
        </Alert>
      ) : null}

      {settings?.cleanupSetupId ? (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>A failed Linear authorization still needs cleanup</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>No active connection was changed. Revoke the failed authorization before retrying.</p>
            <Button
              type="button"
              variant="outline"
              disabled={connectionBusy}
              onClick={() => void cancelAuthorization(settings.cleanupSetupId!)}
            >
              Discard authorization
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <Card className="overflow-hidden border-orange-500/15 bg-card/75 shadow-sm">
        <CardHeader className="border-b bg-muted/20">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-foreground text-background">
                <ChartNoAxesGantt className="size-5" />
              </div>
              <div>
                <CardTitle className="text-base">Linear</CardTitle>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  One workspace and one destination team for this Project Board.
                </p>
              </div>
            </div>
            <Badge
              variant={
                settings?.connection?.health === "active"
                  ? "default"
                  : settings?.connection
                    ? "destructive"
                    : "secondary"
              }
            >
              {settings?.connection?.health === "active"
                ? "Connected"
                : settings?.connection
                  ? "Needs attention"
                  : "Not connected"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 pt-5">
          {settings === undefined ? (
            <div className="flex min-h-32 items-center justify-center">
              <Spinner />
            </div>
          ) : settings.setup ? (
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
                    toast.error(errorMessage(error, "Could not save the Linear destination"));
                  }
                });
              }}
            />
          ) : settings.connection ? (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <ConnectionFact label="Workspace" value={settings.connection.organization.name} />
                <ConnectionFact
                  label="Destination team"
                  value={`${settings.connection.team.name} · ${settings.connection.team.key}`}
                />
              </div>

              {availableTeams ? (
                <div className="rounded-xl border bg-muted/20 p-4">
                  <div className="mb-3">
                    <p className="font-medium">Change destination team</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      This affects future sends only. Existing Linear links do not move.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
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
                    <Button
                      type="button"
                      disabled={!selectedTeamId || connectionBusy}
                      onClick={() => void saveTeam()}
                    >
                      Save team
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={connectionBusy}
                      onClick={() => setAvailableTeams(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2 border-t pt-4">
                <Button
                  type="button"
                  variant="outline"
                  disabled={connectionBusy}
                  onClick={() => void loadTeams()}
                >
                  <RefreshCw /> Change team
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={connectionBusy}
                  onClick={() => void startAuthorization(true)}
                >
                  <Link2 /> Connect another workspace
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="ghost" disabled={connectionBusy}>
                      <Unplug /> Disconnect
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Disconnect Linear?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Wish will revoke its Linear access. Historical External Work Item links stay
                        available, and Linear issues are never deleted.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => void disconnect()}>
                        Disconnect Linear
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ) : settings.configured ? (
            <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
              <SetupStep number="1" title="Authorize Linear" active>
                A Linear workspace admin grants Wish read and issue-creation access.
                <div className="mt-4">
                  <Button
                    type="button"
                    disabled={connectionBusy}
                    onClick={() => void startAuthorization()}
                  >
                    <Link2 /> Authorize Linear
                  </Button>
                </div>
              </SetupStep>
              <div className="hidden items-center text-muted-foreground sm:flex">→</div>
              <SetupStep number="2" title="Choose a team">
                After authorization, choose exactly one destination team for future sends.
              </SetupStep>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Linear authorization is unavailable until the deployment is configured.
            </p>
          )}
        </CardContent>
      </Card>
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
        <SetupStep number="1" title="Linear authorized" complete>
          {setup.organization.name} granted access. Credentials stay encrypted in Wish.
        </SetupStep>
        <div className="hidden items-center text-muted-foreground sm:flex">→</div>
        <SetupStep number="2" title="Choose a team" active>
          {setup.teams.length > 0
            ? "Select the Linear team that should receive future External Work Items."
            : "This installation does not expose any teams to Wish."}
        </SetupStep>
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

function SetupStep({
  active,
  children,
  complete,
  number,
  title,
}: {
  active?: boolean;
  children: ReactNode;
  complete?: boolean;
  number: string;
  title: string;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${active ? "border-orange-500/30 bg-orange-500/5" : "bg-muted/15"}`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`flex size-6 items-center justify-center rounded-full text-xs font-semibold ${complete ? "bg-foreground text-background" : active ? "bg-orange-600 text-white" : "bg-muted text-muted-foreground"}`}
        >
          {complete ? <Check className="size-3.5" /> : number}
        </span>
        <p className="font-medium">{title}</p>
      </div>
      <div className="mt-2 text-sm leading-6 text-muted-foreground">{children}</div>
    </div>
  );
}

function ConnectionFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-muted/15 p-4">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}
