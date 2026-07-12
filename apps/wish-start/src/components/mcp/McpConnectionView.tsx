import { makeFunctionReference } from "convex/server";
import { useAction, useMutation, useQuery } from "convex/react";
import { Check, CircleAlert, Copy, KeyRound, Plug, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import CopyButton from "@/components/Organisms/CopyButton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import env from "@/env";
import { formatDate } from "@/lib/time";

const getActiveMcpToken = makeFunctionReference<"query">("mcpTokens:getActive");
const createMcpToken = makeFunctionReference<"action">("mcpTokens:create");
const revokeMcpToken = makeFunctionReference<"mutation">("mcpTokens:revoke");

function getMcpUrl() {
  if (!env.VITE_CONVEX_URL) {
    return "Configure VITE_CONVEX_URL to show the MCP endpoint";
  }

  const url = new URL(env.VITE_CONVEX_URL);
  url.hostname = url.hostname.replace(".convex.cloud", ".convex.site");
  url.pathname = "/mcp";
  return url.toString();
}

function getCodexConfig(token: string) {
  return `launchctl setenv WISH_MCP_TOKEN "${token}"

codex mcp add wish --url "${getMcpUrl()}" --bearer-token-env-var WISH_MCP_TOKEN`;
}

export default function McpConnectionView() {
  const activeToken = useQuery(getActiveMcpToken, {});
  const createToken = useAction(createMcpToken);
  const revokeToken = useMutation(revokeMcpToken);
  const [createdToken, setCreatedToken] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleCreate() {
    try {
      setIsSubmitting(true);
      const result = await createToken({});
      setCreatedToken(result.token);
      toast.success("MCP token created");
    } catch (error) {
      console.error(error);
      toast.error("Could not create MCP token");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRevoke() {
    try {
      setIsSubmitting(true);
      await revokeToken({});
      toast.success("MCP token revoked");
    } catch (error) {
      console.error(error);
      toast.error("Could not revoke MCP token");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 pb-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.6fr)]">
      <Card className="border-orange-500/20 bg-card/85 shadow-xl shadow-orange-950/5">
        <CardHeader className="border-b border-border/70 pb-6">
          <Badge variant="outline" className="mb-3 w-fit border-orange-500/30 text-orange-700 dark:text-orange-300">
            <Plug /> Account-wide access
          </Badge>
          <CardTitle className="text-2xl tracking-tight">Connect Codex in one paste</CardTitle>
          <CardDescription className="mt-2 max-w-xl text-[15px] leading-6">
            Connect directly to the hosted Wish MCP endpoint with one revocable token. No local server, admin keys, deployment secrets, or impersonation settings are required.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {activeToken === undefined ? null : activeToken ? (
            <div className="rounded-xl border border-orange-500/15 bg-orange-500/5 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">Connection is active</p>
                  <p className="mt-1 text-sm text-muted-foreground">Expires {formatDate(activeToken.expiresAt)}. Creating another token immediately revokes this one.</p>
                </div>
                <Check className="mt-0.5 size-5 text-orange-600" />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => void handleCreate()}>
                  <RotateCcw /> Replace token
                </Button>
                <Button type="button" variant="ghost" disabled={isSubmitting} onClick={() => void handleRevoke()}>
                  Revoke access
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed bg-muted/30 p-5">
              <p className="font-medium">No MCP connection yet</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">Create a token, paste the generated block into Codex, and start using Wish from your assistant.</p>
              <Button type="button" className="mt-4" disabled={isSubmitting} onClick={() => void handleCreate()}>
                <KeyRound /> Create MCP token
              </Button>
            </div>
          )}
          <div className="grid gap-3 text-sm sm:grid-cols-3">
            {["One token", "All your projects", "Revoke anytime"].map((label) => (
              <div key={label} className="flex items-center gap-2 rounded-lg bg-muted/45 px-3 py-2.5"><Check className="size-4 text-orange-600" />{label}</div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-foreground text-background ring-0">
        <CardHeader>
          <CardTitle className="text-base">What Codex can do</CardTitle>
          <CardDescription className="text-background/60">Existing admin tools run with your account permissions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-background/80">
          <p>Manage projects and requests</p>
          <p>Maintain statuses and changelog entries</p>
          <p>Manage project settings and integrations</p>
        </CardContent>
      </Card>

      <Dialog open={Boolean(createdToken)} onOpenChange={(open) => !open && setCreatedToken("")}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Connect Codex</DialogTitle>
            <DialogDescription>Run this once in Terminal to register the hosted MCP endpoint, then restart Codex. This token is shown only once.</DialogDescription>
          </DialogHeader>
          <Alert>
            <CircleAlert className="size-4" />
            <AlertTitle>Treat it like a password</AlertTitle>
            <AlertDescription>Anyone with this token can operate every Wish project you own. Revoke it here if it is exposed.</AlertDescription>
          </Alert>
          <div className="relative overflow-hidden rounded-xl border bg-muted/50">
            <CopyButton text={getCodexConfig(createdToken)} className="absolute top-2 right-2"><Copy size={14} /></CopyButton>
            <pre className="overflow-x-auto p-4 pr-12 font-mono text-xs leading-6"><code>{getCodexConfig(createdToken)}</code></pre>
          </div>
          <DialogFooter><Button type="button" onClick={() => setCreatedToken("")}>Done</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
