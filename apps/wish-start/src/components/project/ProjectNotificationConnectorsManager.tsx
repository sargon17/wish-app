"use client";

import { useMutation, useQuery } from "convex/react";
import { Bell, Bot, ExternalLink, Send, Unplug } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import CopyButton from "@/components/Organisms/CopyButton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { formatDate } from "@/lib/time";
import { api } from "@wish/convex-backend/api";
import type { Id } from "@wish/convex-backend/data-model";

const EVENT_LABELS = {
  "request.created": "New requests",
  "complaint.created": "New complaints",
  "request.comment_created": "New comments",
  "complaint.case_event_created": "Complaint case updates",
};

export default function ProjectNotificationConnectorsManager({
  projectId,
}: {
  projectId: Id<"projects">;
}) {
  const connectors = useQuery(api.notificationConnectors.listByProject, { projectId });
  const createTelegramConnectionToken = useMutation(api.notificationConnectors.createTelegramConnectionToken);
  const setTelegramEnabled = useMutation(api.notificationConnectors.setTelegramEnabled);
  const [connectionToken, setConnectionToken] = useState<Awaited<
    ReturnType<typeof createTelegramConnectionToken>
  > | null>(null);
  const [isCreatingToken, setIsCreatingToken] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const telegramConnector = connectors?.find((connector) => connector.kind === "telegram");
  const eventTypes = telegramConnector?.eventTypes ?? Object.keys(EVENT_LABELS);

  async function handleCreateTelegramConnectionToken() {
    try {
      setIsCreatingToken(true);
      const result = await createTelegramConnectionToken({ projectId });
      setConnectionToken(result);
      toast.success("Telegram connection token created");
    } catch (error) {
      console.error(error);
      toast.error("Unable to create Telegram connection token");
    } finally {
      setIsCreatingToken(false);
    }
  }

  async function handleEnabledChange(enabled: boolean) {
    if (!telegramConnector) {
      return;
    }

    try {
      setIsUpdating(true);
      await setTelegramEnabled({ projectId, enabled });
      toast.success(enabled ? "Telegram notifications enabled" : "Telegram notifications paused");
    } catch (error) {
      console.error(error);
      toast.error("Unable to update Telegram notifications");
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3>Notification connectors</h3>
          <p className="text-sm text-muted-foreground">
            Connect the official Wish bot to receive project notifications in Telegram.
          </p>
        </div>
        <Button type="button" disabled={isCreatingToken} onClick={handleCreateTelegramConnectionToken}>
          <Bot />
          {telegramConnector ? "Reconnect Telegram" : "Connect Telegram"}
        </Button>
      </div>

      <Alert>
        <Bell className="size-4" />
        <AlertTitle>Fixed v1 notification set</AlertTitle>
        <AlertDescription>
          Telegram sends the default project activity feed for now. Choosing individual notification types inside the bot
          is intentionally deferred to the next phase.
        </AlertDescription>
      </Alert>

      <div className="rounded-xl border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-medium">Telegram</h4>
              <Badge variant={telegramConnector?.enabled ? "default" : "outline"}>
                {telegramConnector?.enabled ? "Connected" : "Not connected"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {telegramConnector?.telegramChatTitle
                ? `Delivering to ${telegramConnector.telegramChatTitle}.`
                : "Generate a token, open the official bot, and send the token to connect this project."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="telegram-notifications-enabled" className="text-sm">
              Enabled
            </Label>
            <Switch
              id="telegram-notifications-enabled"
              checked={telegramConnector?.enabled === true}
              disabled={!telegramConnector || isUpdating}
              onCheckedChange={(checked) => void handleEnabledChange(checked)}
            />
          </div>
        </div>

        <Separator className="my-4" />

        <div className="grid gap-3">
          <Label>Events sent in v1</Label>
          <div className="flex flex-wrap gap-2">
            {eventTypes.map((eventType) => (
              <Badge key={eventType} variant="secondary">
                {EVENT_LABELS[eventType as keyof typeof EVENT_LABELS] ?? eventType}
              </Badge>
            ))}
          </div>
        </div>

        {connectionToken ? (
          <div className="mt-4 grid gap-3 rounded-lg border bg-muted/20 p-3">
            <div className="space-y-1">
              <Label>Connection token</Label>
              <p className="text-sm text-muted-foreground">
                This token expires at {formatDate(connectionToken.expiresAt)} and can be used once.
              </p>
            </div>
            <InputGroup>
              <InputGroupAddon>
                <InputGroupText>Token</InputGroupText>
              </InputGroupAddon>
              <InputGroupInput value={connectionToken.token} readOnly />
              <InputGroupAddon align="inline-end">
                <CopyButton text={connectionToken.token} variant="input-button" />
              </InputGroupAddon>
            </InputGroup>
            <div className="flex flex-wrap justify-end gap-2">
              {connectionToken.botLink ? (
                <Button type="button" variant="outline" asChild>
                  <a href={connectionToken.botLink} target="_blank" rel="noreferrer">
                    <ExternalLink />
                    Open bot
                  </a>
                </Button>
              ) : null}
              <Button type="button" variant="outline" onClick={() => setConnectionToken(null)}>
                <Unplug />
                Hide token
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border border-dashed p-4">
        <div className="flex items-start gap-3">
          <Send className="mt-0.5 size-4 text-muted-foreground" />
          <div className="space-y-1">
            <h4 className="font-medium">Email adapter</h4>
            <p className="text-sm text-muted-foreground">
              The backend stores notification connectors generically, so email can use the same event and delivery
              pipeline once sender, recipient, unsubscribe, and provider decisions are approved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
