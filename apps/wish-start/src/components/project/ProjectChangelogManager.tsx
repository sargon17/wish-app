"use client";

import { api } from "@wish/convex-backend/api";
import type { Id } from "@wish/convex-backend/data-model";
import { useMutation, useQuery } from "convex/react";
import { Copy, FileClock, Globe, Pencil, Rocket, Trash2, Undo2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import ProjectChangelogEditor from "@/components/project/ProjectChangelogEditor";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import env from "@/env";
import { getConvexHttpBaseUrl } from "@/lib/convexHttp";
import { formatDate } from "@/lib/time";

function CopyUrlButton({ value }: { value: string }) {
  async function handleCopy() {
    try {
      const normalizedValue = value.startsWith("http")
        ? value
        : new URL(value, window.location.origin).toString();

      await navigator.clipboard.writeText(normalizedValue);
      toast.success("Copied to clipboard");
    } catch (error) {
      console.error(error);
      toast.error("Could not copy the URL");
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleCopy} disabled={!value}>
      <Copy />
      Copy
    </Button>
  );
}

function DeleteDraftButton({
  entryId,
  onDelete,
}: {
  entryId: Id<"changelogEntries">;
  onDelete: (entryId: Id<"changelogEntries">) => Promise<void>;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Trash2 />
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete draft</AlertDialogTitle>
          <AlertDialogDescription>
            This draft will be removed permanently. Published entries must be unpublished first.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => onDelete(entryId)}>Delete draft</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function PublicLinksDialog({
  publicPageUrl,
  publicApiUrl,
}: {
  publicPageUrl: string;
  publicApiUrl: string;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Globe />
          Public links
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Changelog links</DialogTitle>
          <DialogDescription>
            Use the hosted public page for customers. Keep the JSON endpoint only for integrations
            that need it.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <Card className="border-dashed bg-background/80 shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Hosted public page</CardTitle>
              <CardDescription>{publicPageUrl || "Generating URL..."}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <CopyUrlButton value={publicPageUrl} />
            </CardContent>
          </Card>

          <Card className="border-dashed bg-background/80 shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">JSON endpoint</CardTitle>
              <CardDescription>{publicApiUrl || "Generating URL..."}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <CopyUrlButton value={publicApiUrl} />
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ProjectChangelogManager({
  projectId,
  newEntryTrigger,
}: {
  projectId: Id<"projects">;
  newEntryTrigger?: number;
}) {
  const project = useQuery(api.projects.getProjectById, { id: projectId });
  const entries = useQuery(api.changelogEntries.listByProject, { projectId });
  const ensurePublicChangelogSlug = useMutation(api.projects.ensurePublicChangelogSlug);
  const createEntry = useMutation(api.changelogEntries.create);
  const saveEntry = useMutation(api.changelogEntries.save);
  const publishEntry = useMutation(api.changelogEntries.publish);
  const unpublishEntry = useMutation(api.changelogEntries.unpublish);
  const deleteDraft = useMutation(api.changelogEntries.deleteDraft);
  const [selectedEntryId, setSelectedEntryId] = useState<Id<"changelogEntries"> | null>(null);
  const [draftEntry, setDraftEntry] = useState<{
    versionLabel: string;
    title: string;
    summary?: string;
    body?: string;
    type: "feature" | "improvement" | "fix";
    status: "draft";
  } | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!project || project.publicChangelogSlug) {
      return;
    }

    void ensurePublicChangelogSlug({ id: projectId }).catch((error) => {
      console.error(error);
    });
  }, [ensurePublicChangelogSlug, project, projectId]);

  useEffect(() => {
    if (!newEntryTrigger) {
      return;
    }

    setDraftEntry({
      versionLabel: "",
      title: "",
      summary: undefined,
      body: undefined,
      type: "feature",
      status: "draft",
    });
    setSelectedEntryId(null);
    setIsEditorOpen(true);
  }, [newEntryTrigger]);

  const selectedEntry = useMemo(() => {
    if (draftEntry) {
      return draftEntry;
    }

    if (!entries || !selectedEntryId) {
      return null;
    }

    return entries.find((entry) => entry._id === selectedEntryId) ?? null;
  }, [draftEntry, entries, selectedEntryId]);

  const publicSlug = project?.publicChangelogSlug ?? "";
  const publicPageUrl = publicSlug ? `/changelog/${publicSlug}` : "";
  const convexHttpBaseUrl = getConvexHttpBaseUrl(env.VITE_CONVEX_URL);
  const publicApiUrl =
    publicSlug && convexHttpBaseUrl ? `${convexHttpBaseUrl}/api/changelog/${publicSlug}` : "";

  async function handleSave(values: {
    versionLabel: string;
    title: string;
    summary?: string;
    body?: string;
    type: "feature" | "improvement" | "fix";
  }) {
    if (!selectedEntry) {
      return;
    }

    try {
      setIsSaving(true);
      if (draftEntry) {
        const entryId = await createEntry({
          projectId,
          versionLabel: values.versionLabel,
          title: values.title,
          summary: values.summary,
          body: values.body,
          type: values.type,
        });

        setDraftEntry(null);
        setSelectedEntryId(entryId);
        setIsEditorOpen(false);
        toast.success("Draft created");
      } else {
        if (!("_id" in selectedEntry)) {
          return;
        }

        await saveEntry({
          entryId: selectedEntry._id,
          versionLabel: values.versionLabel,
          title: values.title,
          summary: values.summary,
          body: values.body,
          type: values.type,
        });
        setSelectedEntryId(null);
        setIsEditorOpen(false);
        toast.success("Entry saved");
      }
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Could not save the changelog entry");
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePublish(entryId: Id<"changelogEntries">) {
    try {
      await publishEntry({ entryId });
      toast.success("Entry published");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Could not publish the changelog entry");
    }
  }

  async function handleUnpublish(entryId: Id<"changelogEntries">) {
    try {
      await unpublishEntry({ entryId });
      toast.success("Entry moved back to draft");
    } catch (error) {
      console.error(error);
      toast.error("Could not unpublish the changelog entry");
    }
  }

  async function handleDeleteDraft(entryId: Id<"changelogEntries">) {
    try {
      await deleteDraft({ entryId });
      if (selectedEntryId === entryId) {
        setSelectedEntryId(null);
        setIsEditorOpen(false);
      }
      toast.success("Draft deleted");
    } catch (error) {
      console.error(error);
      toast.error("Could not delete the draft");
    }
  }

  return (
    <div className="max-w-full space-y-6 pb-8">
      <div className="flex items-center justify-end">
        <PublicLinksDialog publicPageUrl={publicPageUrl} publicApiUrl={publicApiUrl} />
      </div>

      <div className="grid gap-4">
        {entries === undefined ? (
          <div className="rounded-2xl border border-dashed bg-background/45 p-8 text-center text-sm text-muted-foreground">
            Loading changelog entries...
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-gradient-to-br from-orange-500/8 via-background to-background p-8 text-center text-sm text-muted-foreground">
            No changelog entries yet. Create the first release note, publish it, and your hosted
            page and API feed will update automatically.
          </div>
        ) : (
          entries.map((entry) => (
            <Card key={entry._id} className=" border-border/70 bg-background/80 backdrop-blur-sm">
              <CardHeader className="gap-3 pb-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={entry.status === "published" ? "default" : "outline"}>
                        {entry.status}
                      </Badge>
                      <Badge variant="secondary" className="capitalize">
                        {entry.type}
                      </Badge>
                      <Badge variant="outline">{entry.versionLabel || "No version yet"}</Badge>
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        {entry.title || "Untitled changelog entry"}
                      </CardTitle>
                      <CardDescription>
                        {entry.status === "published"
                          ? `Published ${formatDate(entry.publishedAt)}`
                          : `Updated ${formatDate(entry.updatedAt)}`}
                      </CardDescription>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedEntryId(entry._id);
                        setIsEditorOpen(true);
                      }}
                    >
                      <Pencil />
                      Edit
                    </Button>

                    {entry.status === "draft" ? (
                      <>
                        <Button type="button" size="sm" onClick={() => handlePublish(entry._id)}>
                          <Rocket />
                          Publish
                        </Button>
                        <DeleteDraftButton entryId={entry._id} onDelete={handleDeleteDraft} />
                      </>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleUnpublish(entry._id)}
                      >
                        <Undo2 />
                        Unpublish
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {entry.summary ? (
                  <p className="text-sm text-muted-foreground">{entry.summary}</p>
                ) : null}

                {entry.body ? (
                  <div className="rounded-xl border bg-muted/20 p-4 text-sm leading-6 whitespace-pre-wrap text-foreground/90">
                    {entry.body}
                  </div>
                ) : null}

                <Separator />

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <FileClock className="size-4" />
                  Created {formatDate(entry.createdAt)}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <ProjectChangelogEditor
        entry={selectedEntry}
        open={isEditorOpen}
        isSaving={isSaving}
        onOpenChange={(open) => {
          setIsEditorOpen(open);
          if (!open) {
            setDraftEntry(null);
            setSelectedEntryId(null);
          }
        }}
        onSave={handleSave}
      />
    </div>
  );
}
