"use client";

import { useMutation, useQuery } from "convex/react";
import { Bot, ExternalLink, Unplug } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useAsyncAction } from "#/hooks/useAsyncAction";

import CopyButton from "@/components/Organisms/CopyButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { formatDate } from "@/lib/time";
import { api } from "@wish/convex-backend/api";
import type { Id } from "@wish/convex-backend/data-model";
import { EVENT_LABELS, NOTIFICATION_EVENTS } from "@wish/convex-backend/notification-event-types";


const strings = {
  toast: {
    tokenCreated: "Telegram connection token created",
    tokenError: "Failed to create Telegram connection token",
    connectionTokenCopied: "Telegram connection token copied to clipboard",
    notificationEnabled: "Notifications enabled",
    notificationDisabled: "Notifications disabled",
    notificationError: "Failed to update notifications",
  },
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

  const telegramConnector = connectors?.find((connector) => connector.kind === "telegram");
  const eventTypes = telegramConnector?.eventTypes ?? NOTIFICATION_EVENTS.map((event) => event.type);


  const telegramCreateTokenAction = useAsyncAction();
  const toggleTelegramAction = useAsyncAction();

  async function handleCreateTelegramConnectionToken() {
    await telegramCreateTokenAction.execute(
      () => createTelegramConnectionToken({ projectId }),
      {
        onSuccess:
          (data) => {
            setConnectionToken(data)
            toast.success(strings.toast.tokenCreated);
          },
        onError:
          () => toast.error(strings.toast.tokenError),
      });
  }

  async function handleEnabledChange(enabled: boolean) {
    if (!telegramConnector) {
      return;
    }

    await toggleTelegramAction.execute(
      () => setTelegramEnabled({ projectId, enabled }),
      {
        onSuccess:
          () => toast.success(enabled ? strings.toast.notificationEnabled : strings.toast.notificationDisabled),
        onError:
          () => toast.error(strings.toast.notificationError),
      }
    )
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
        <Button type="button" disabled={telegramCreateTokenAction.isLoading} onClick={handleCreateTelegramConnectionToken}>
          <Bot />
          {telegramConnector ? "Reconnect Telegram" : "Connect Telegram"}
        </Button>
      </div>

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
              disabled={!telegramConnector || toggleTelegramAction.isLoading}
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
    </div>
  );
}
