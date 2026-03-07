"use client";

import { useMutation, useQuery } from "convex/react";
import { Ban, KeyRound, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import CopyButton from "@/components/Organisms/CopyButton";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

const API_KEY_SCOPES = ["read", "write", "admin"] as const;

function formatDate(value?: number) {
  if (!value) {
    return "Never";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function ApiKeyCreateDialog({
  projectId,
}: {
  projectId: Id<"projects">;
}) {
  const createApiKey = useMutation(api.apiKeys.create);
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<Array<(typeof API_KEY_SCOPES)[number]>>([
    "read",
    "write",
  ]);
  const [createdApiKey, setCreatedApiKey] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function resetState() {
    setName("");
    setSelectedScopes(["read", "write"]);
    setCreatedApiKey("");
    setIsSubmitting(false);
  }

  function toggleScope(scope: (typeof API_KEY_SCOPES)[number], checked: boolean) {
    setSelectedScopes((currentScopes) => {
      if (checked) {
        return Array.from(new Set([...currentScopes, scope]));
      }

      return currentScopes.filter((currentScope) => currentScope !== scope);
    });
  }

  async function handleCreate() {
    try {
      setIsSubmitting(true);
      const result = await createApiKey({
        projectId,
        name,
        scopes: selectedScopes,
      });

      setCreatedApiKey(result.apiKey);
      toast.success("API key created");
    } catch (error) {
      console.error(error);
      toast.error("Could not create API key");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          resetState();
        }
      }}
    >
      <Button type="button" onClick={() => setIsOpen(true)}>
        <Plus />
        New key
      </Button>
      <DialogContent className="sm:max-w-xl">
        {createdApiKey ? (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle>API key created</DialogTitle>
              <DialogDescription>
                This raw key is visible only once. After you close this dialog, only metadata remains.
              </DialogDescription>
            </DialogHeader>
            <Alert>
              <KeyRound className="size-4" />
              <AlertTitle>Save this key now</AlertTitle>
              <AlertDescription>
                The dashboard stores only the hash and a short preview.
              </AlertDescription>
            </Alert>
            <InputGroup>
              <InputGroupAddon>
                <InputGroupText>API key</InputGroupText>
              </InputGroupAddon>
              <InputGroupInput value={createdApiKey} readOnly />
              <InputGroupAddon align="inline-end">
                <CopyButton text={createdApiKey} variant="input-button" />
              </InputGroupAddon>
            </InputGroup>
            <DialogFooter>
              <Button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                }}
              >
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle>Create API key</DialogTitle>
              <DialogDescription>
                Name this key by integration and choose the minimum scope it needs.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              <Label htmlFor="api-key-name">Key name</Label>
              <Input
                id="api-key-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Staging widget"
              />
            </div>
            <div className="grid gap-3">
              <Label>Scopes</Label>
              <div className="grid gap-2 rounded-md border p-3">
                {API_KEY_SCOPES.map((scope) => (
                  <label key={scope} className="flex items-center gap-3 text-sm capitalize">
                    <Checkbox
                      checked={selectedScopes.includes(scope)}
                      onCheckedChange={(checked) => toggleScope(scope, checked === true)}
                    />
                    <span>{scope}</span>
                  </label>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={isSubmitting || name.trim().length < 2 || selectedScopes.length === 0}
                onClick={handleCreate}
              >
                Create key
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ApiKeyRevokeButton({
  apiKeyId,
  projectId,
  disabled,
}: {
  apiKeyId: Id<"apiKeys">;
  projectId: Id<"projects">;
  disabled?: boolean;
}) {
  const revokeApiKey = useMutation(api.apiKeys.revoke);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleRevoke() {
    try {
      setIsSubmitting(true);
      await revokeApiKey({ projectId, apiKeyId });
      toast.success("API key revoked");
    } catch (error) {
      console.error(error);
      toast.error("Could not revoke API key");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" disabled={disabled || isSubmitting}>
          <Ban />
          Revoke
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Revoke API key</AlertDialogTitle>
          <AlertDialogDescription>
            This key will stop working immediately and cannot be reactivated.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleRevoke}>Revoke key</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function ProjectApiKeysManager({
  projectId,
}: {
  projectId: Id<"projects">;
}) {
  const apiKeys = useQuery(api.apiKeys.listByProject, { projectId });
  const migrateLegacyApiKeys = useMutation(api.apiKeys.migrateLegacyForProject);

  useEffect(() => {
    void migrateLegacyApiKeys({ projectId }).catch((error) => {
      console.error(error);
    });
  }, [migrateLegacyApiKeys, projectId]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-1">
          <h3>API keys</h3>
          <p className="text-sm text-muted-foreground">
            Create separate credentials per integration, then revoke them individually when needed.
          </p>
        </div>
        <ApiKeyCreateDialog projectId={projectId} />
      </div>
      <Alert>
        <KeyRound className="size-4" />
        <AlertTitle>One-time plaintext reveal</AlertTitle>
        <AlertDescription>
          Raw keys are shown only when created. Existing rows show metadata, usage, and status.
        </AlertDescription>
      </Alert>
      <div className="rounded-xl border bg-muted/10 p-3">
        {apiKeys === undefined ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Loading API keys...
          </div>
        ) : apiKeys.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No API keys yet.
          </div>
        ) : (
          <Table className="min-w-[980px]">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Preview</TableHead>
                <TableHead>Scopes</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last used</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiKeys.map((apiKey) => (
                <TableRow key={apiKey._id}>
                  <TableCell className="font-medium">{apiKey.name}</TableCell>
                  <TableCell>{apiKey.preview}</TableCell>
                  <TableCell className="max-w-[220px] whitespace-normal">
                    <div className="flex flex-wrap gap-1">
                      {apiKey.scopes.map((scope) => (
                        <Badge key={scope} variant="secondary" className="capitalize">
                          {scope}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={apiKey.status === "active" ? "default" : "outline"}>
                      {apiKey.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(apiKey.createdAt)}</TableCell>
                  <TableCell>{formatDate(apiKey.lastUsedAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end">
                      <ApiKeyRevokeButton
                        apiKeyId={apiKey._id}
                        projectId={projectId}
                        disabled={apiKey.status !== "active"}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
