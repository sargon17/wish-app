"use client";

// PROTOTYPE: three Linear handoff variants, switchable with ?variant=A|B|C.

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  ExternalLink,
  Link2,
  LoaderCircle,
  Send,
  Unplug,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const variants = [
  { key: "A", name: "Dedicated workflow" },
  { key: "B", name: "Compact connector" },
  { key: "C", name: "Inline destination" },
] as const;

function readVariant() {
  if (typeof window === "undefined") return "A";
  const candidate = new URLSearchParams(window.location.search).get("variant");
  return variants.some(({ key }) => key === candidate) ? candidate : "A";
}

function usePrototypeVariant() {
  const [variant, setVariant] = useState(readVariant);

  useEffect(() => {
    function syncVariant() {
      setVariant(readVariant());
    }

    window.addEventListener("popstate", syncVariant);
    return () => window.removeEventListener("popstate", syncVariant);
  }, []);

  function selectVariant(next: string) {
    const url = new URL(window.location.href);
    url.searchParams.set("variant", next);
    window.history.replaceState(null, "", url);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  return { variant, selectVariant };
}

export function LinearSettingsPrototype() {
  const { variant } = usePrototypeVariant();
  if (variant === "B") return <CompactConnector />;
  if (variant === "C") return <InlineDestination />;
  return <DedicatedWorkflow />;
}

function DedicatedWorkflow() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-[#5E6AD2] font-semibold text-white">
            L
          </div>
          <h3>Send feedback to Linear</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Create Linear issues directly from requests and complaints.
        </p>
      </div>

      <ol className="grid gap-3">
        <li className="flex items-center justify-between gap-4 rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <Badge className="size-6 rounded-full p-0">1</Badge>
            <div>
              <p className="text-sm font-medium">Authorize Linear</p>
              <p className="text-xs text-muted-foreground">Requires a Linear workspace admin.</p>
            </div>
          </div>
          <Button type="button">Connect Linear</Button>
        </li>
        <li className="flex items-center justify-between gap-4 rounded-lg border border-dashed p-4 opacity-50">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="size-6 rounded-full p-0">
              2
            </Badge>
            <div>
              <p className="text-sm font-medium">Choose a team</p>
              <p className="text-xs text-muted-foreground">Available after authorization.</p>
            </div>
          </div>
          <Button type="button" variant="outline" disabled>
            Choose team
          </Button>
        </li>
      </ol>
    </div>
  );
}

function CompactConnector() {
  return (
    <div className="space-y-5">
      <div>
        <h3>Work trackers</h3>
        <p className="text-sm text-muted-foreground">Turn accepted feedback into external work.</p>
      </div>
      <div className="rounded-xl border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-[#5E6AD2] font-semibold text-white">
              L
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-medium">Linear</h4>
                <Badge variant="secondary">
                  <Check /> Connected
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">Acme · Product</p>
            </div>
          </div>
          <Button type="button" variant="outline">
            <Unplug /> Disconnect
          </Button>
        </div>
      </div>
    </div>
  );
}

function InlineDestination() {
  return (
    <div className="space-y-5">
      <div>
        <h3>External work</h3>
        <p className="text-sm text-muted-foreground">One destination for this project.</p>
      </div>
      <div className="grid gap-4 rounded-xl border p-5 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <div className="grid gap-2">
          <Label>Tracker</Label>
          <Select defaultValue="linear">
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="linear">Linear</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Destination team</Label>
          <Select defaultValue="product">
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="product">Acme · Product</SelectItem>
              <SelectItem value="engineering">Acme · Engineering</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="button" variant="outline">
          <Link2 /> Reauthorize
        </Button>
      </div>
    </div>
  );
}

export function LinearRequestActionPrototype() {
  const { variant } = usePrototypeVariant();
  const [state, setState] = useState<"ready" | "pending" | "succeeded" | "failed" | "unknown">(
    "ready",
  );

  function send() {
    setState("pending");
    window.setTimeout(() => {
      setState("succeeded");
      toast.success("Created LIN-482", {
        action: { label: "Open issue", onClick: () => window.open("https://linear.app", "_blank") },
      });
    }, 650);
  }

  const action =
    state === "succeeded" ? (
      <Button type="button" variant="outline" asChild>
        <a href="https://linear.app" target="_blank" rel="noreferrer">
          <ExternalLink /> Open LIN-482
        </a>
      </Button>
    ) : (
      <Button type="button" disabled={state === "pending" || state === "unknown"} onClick={send}>
        {state === "pending" ? <LoaderCircle className="animate-spin" /> : <Send />}
        {state === "pending" ? "Sending…" : state === "failed" ? "Retry Linear" : "Send to Linear"}
      </Button>
    );

  return (
    <div
      className={cn(
        "mt-4",
        variant === "B" && "rounded-lg border bg-muted/20 p-3",
        variant === "C" && "border-l-2 border-[#5E6AD2] pl-4",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">
            {variant === "A"
              ? "External work"
              : variant === "B"
                ? "Linear · Product"
                : "Ready for engineering?"}
          </p>
          <p className="text-xs text-muted-foreground">
            {state === "succeeded"
              ? "Linked to LIN-482"
              : state === "unknown"
                ? "Checking whether Linear created the issue…"
                : "Creates immediately from this feedback."}
          </p>
        </div>
        {action}
      </div>

      {state === "failed" ? (
        <Alert variant="destructive" className="mt-3">
          <AlertCircle />
          <AlertTitle>Linear rejected the request</AlertTitle>
          <AlertDescription>Reconnect Linear, then retry this Handoff.</AlertDescription>
        </Alert>
      ) : null}
      {state === "unknown" ? (
        <Alert className="mt-3">
          <LoaderCircle className="animate-spin" />
          <AlertTitle>Checking Linear</AlertTitle>
          <AlertDescription>Sending is disabled until Wish confirms the outcome.</AlertDescription>
        </Alert>
      ) : null}

      <div className="mt-3 flex gap-1 border-t pt-3">
        {(["ready", "failed", "unknown"] as const).map((preview) => (
          <Button
            key={preview}
            type="button"
            size="xs"
            variant={state === preview ? "secondary" : "ghost"}
            onClick={() => setState(preview)}
          >
            {preview}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function LinearPrototypeSwitcher() {
  const { variant, selectVariant } = usePrototypeVariant();
  const index = variants.findIndex(({ key }) => key === variant);

  function move(offset: number) {
    selectVariant(variants[(index + offset + variants.length) % variants.length].key);
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (target.matches("input, textarea, [contenteditable]")) return;
      if (event.key === "ArrowLeft") move(-1);
      if (event.key === "ArrowRight") move(1);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  if (import.meta.env.PROD) return null;

  return (
    <div className="fixed bottom-5 left-1/2 z-100 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/15 bg-neutral-950 p-1 text-white shadow-2xl">
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        className="text-white hover:bg-white/10 hover:text-white"
        aria-label="Previous prototype"
        onClick={() => move(-1)}
      >
        <ArrowLeft />
      </Button>
      <Separator orientation="vertical" className="h-4 bg-white/20" />
      <span className="min-w-42 px-3 text-center text-xs font-medium">
        {variant} — {variants[index].name}
      </span>
      <Separator orientation="vertical" className="h-4 bg-white/20" />
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        className="text-white hover:bg-white/10 hover:text-white"
        aria-label="Next prototype"
        onClick={() => move(1)}
      >
        <ArrowRight />
      </Button>
    </div>
  );
}
