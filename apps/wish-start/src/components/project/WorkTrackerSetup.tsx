import {
  AlertTriangle,
  Check,
  Link2,
  RefreshCw,
  Unplug,
} from "lucide-react";
import type { ReactNode } from "react";

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
import { Spinner } from "@/components/ui/spinner";

export function WorkTrackerCallbackAlert({
  description,
  onDismiss,
  successful,
  title,
}: {
  description: string;
  onDismiss?: () => void;
  successful: boolean;
  title: string;
}) {
  return (
    <Alert variant={successful ? "default" : "destructive"}>
      {successful ? <Check /> : <AlertTriangle />}
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        {description}
        {onDismiss ? (
          <Button type="button" variant="link" className="mt-2 h-auto p-0" onClick={onDismiss}>
            Dismiss
          </Button>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}

export function WorkTrackerConfigurationAlert({
  description,
  provider,
}: {
  description: string;
  provider: string;
}) {
  return (
    <Alert variant="destructive">
      <AlertTriangle />
      <AlertTitle>{provider} is not configured</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
    </Alert>
  );
}

export function WorkTrackerCleanupAlert({
  busy,
  description,
  onDiscard,
  title,
}: {
  busy: boolean;
  description: string;
  onDiscard: () => void;
  title: string;
}) {
  return (
    <Alert variant="destructive">
      <AlertTriangle />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{description}</p>
        <Button type="button" variant="outline" disabled={busy} onClick={onDiscard}>
          Discard authorization
        </Button>
      </AlertDescription>
    </Alert>
  );
}

export function WorkTrackerCard({
  configured,
  connectedContent,
  connectionHealth,
  description,
  disconnectedContent,
  icon,
  loading,
  setupContent,
  title,
  unavailableText,
}: {
  configured: boolean;
  connectedContent?: ReactNode;
  connectionHealth?: "active" | "attention";
  description: string;
  disconnectedContent: ReactNode;
  icon: ReactNode;
  loading: boolean;
  setupContent?: ReactNode;
  title: string;
  unavailableText: string;
}) {
  return (
    <Card className="overflow-hidden border-orange-500/15 bg-card/75 shadow-sm">
      <CardHeader className="border-b bg-muted/20">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-foreground text-background">
              {icon}
            </div>
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
          <Badge
            variant={
              connectionHealth === "active"
                ? "default"
                : connectionHealth
                  ? "destructive"
                  : "secondary"
            }
          >
            {connectionHealth === "active"
              ? "Connected"
              : connectionHealth
                ? "Needs attention"
                : "Not connected"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        {loading ? (
          <div className="flex min-h-32 items-center justify-center">
            <Spinner />
          </div>
        ) : setupContent ? (
          setupContent
        ) : connectedContent ? (
          connectedContent
        ) : configured ? (
          disconnectedContent
        ) : (
          <p className="text-sm text-muted-foreground">{unavailableText}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function WorkTrackerDestinationEditor({
  busy,
  children,
  description,
  onCancel,
  onSave,
  saveDisabled,
  saveLabel,
  title,
}: {
  busy: boolean;
  children: ReactNode;
  description: string;
  onCancel: () => void;
  onSave: () => void;
  saveDisabled: boolean;
  saveLabel: string;
  title: string;
}) {
  return (
    <div className="rounded-xl border bg-muted/20 p-4">
      <div className="mb-3">
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {children}
        <Button type="button" disabled={saveDisabled || busy} onClick={onSave}>
          {saveLabel}
        </Button>
        <Button type="button" variant="ghost" disabled={busy} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function WorkTrackerConnectionActions({
  busy,
  changeLabel,
  connectLabel,
  disconnectDescription,
  disconnectLabel,
  onChange,
  onConnect,
  onDisconnect,
  provider,
}: {
  busy: boolean;
  changeLabel: string;
  connectLabel: string;
  disconnectDescription: string;
  disconnectLabel: string;
  onChange: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
  provider: string;
}) {
  return (
    <div className="flex flex-wrap gap-2 border-t pt-4">
      <Button type="button" variant="outline" disabled={busy} onClick={onChange}>
        <RefreshCw /> {changeLabel}
      </Button>
      <Button type="button" variant="outline" disabled={busy} onClick={onConnect}>
        <Link2 /> {connectLabel}
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button type="button" variant="ghost" disabled={busy}>
            <Unplug /> Disconnect
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect {provider}?</AlertDialogTitle>
            <AlertDialogDescription>{disconnectDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDisconnect}>{disconnectLabel}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function WorkTrackerSetupFlow({
  action,
  firstDescription,
  firstTitle,
  secondDescription,
  secondTitle,
}: {
  action: ReactNode;
  firstDescription: string;
  firstTitle: string;
  secondDescription: string;
  secondTitle: string;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
      <WorkTrackerSetupStep number="1" title={firstTitle} active>
        {firstDescription}
        <div className="mt-4">{action}</div>
      </WorkTrackerSetupStep>
      <div className="hidden items-center text-muted-foreground sm:flex">→</div>
      <WorkTrackerSetupStep number="2" title={secondTitle}>
        {secondDescription}
      </WorkTrackerSetupStep>
    </div>
  );
}

export function WorkTrackerSetupStep({
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

export function WorkTrackerConnectionFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-muted/15 p-4">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}
