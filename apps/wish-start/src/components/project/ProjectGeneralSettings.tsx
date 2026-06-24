"use client";

import { useMutation, useQuery } from "convex/react";
import { AlertCircle, ExternalLink, Save } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { api } from "@wish/convex-backend/api";
import type { Id } from "@wish/convex-backend/data-model";

export default function ProjectGeneralSettings({ projectId }: { projectId: Id<"projects"> }) {
  const project = useQuery(api.projects.getProjectById, { id: projectId });
  const updateProject = useMutation(api.projects.updateProject);
  const publishSuggestionPortal = useMutation(api.projects.publishSuggestionPortal);
  const unpublishSuggestionPortal = useMutation(api.projects.unpublishSuggestionPortal);
  const [title, setTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    if (project?.title) {
      setTitle(project.title);
    }
  }, [project?._id, project?.title]);

  const cleanTitle = title.trim();
  const isDirty = project ? cleanTitle !== project.title : false;
  const hasInvalidTitle = cleanTitle.length > 0 && cleanTitle.length < 3;

  async function handleSave() {
    if (!project) {
      return;
    }

    if (cleanTitle.length < 3) {
      toast.error("Project title must be at least 3 characters");
      return;
    }

    setIsSaving(true);
    try {
      await updateProject({ id: project._id, title: cleanTitle });
      toast.success("Project updated");
    } catch (error) {
      console.error(error);
      toast.error("Unable to update the project");
      throw new Error("Unable to update the project");
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePortalPublishChange(nextPublished: boolean) {
    if (!project) {
      return;
    }

    setIsPublishing(true);
    try {
      if (nextPublished) {
        await publishSuggestionPortal({ id: project._id });
        toast.success("Suggestion portal published");
      } else {
        await unpublishSuggestionPortal({ id: project._id });
        toast.success("Suggestion portal unpublished");
      }
    } catch (error) {
      console.error(error);
      toast.error("Unable to update the suggestion portal");
      throw new Error("Unable to update the suggestion portal");
    } finally {
      setIsPublishing(false);
    }
  }

  const portalPath = project?.projectSlug ? `/p/${project.projectSlug}` : "";
  const portalUrl = typeof window === "undefined" || !portalPath ? portalPath : `${window.location.origin}${portalPath}`;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">General</h3>
        <p className="text-sm text-muted-foreground">
          Update the project name used across the dashboard and public widgets.
        </p>
      </div>

      <div className="grid gap-3">
        <Label htmlFor="project-settings-title">Project name</Label>
        <Input
          id="project-settings-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Wish mobile app"
          aria-invalid={hasInvalidTitle}
        />
        {hasInvalidTitle ? (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>Title too short</AlertTitle>
            <AlertDescription>Use at least 3 characters.</AlertDescription>
          </Alert>
        ) : null}
      </div>

      <div className="grid gap-3">
        <Label>Project ID</Label>
        <InputGroup>
          <InputGroupAddon>
            <InputGroupText>ID</InputGroupText>
          </InputGroupAddon>
          <InputGroupInput value={project?._id ?? ""} disabled />
          <InputGroupAddon align="inline-end">
            <CopyButton text={project?._id ?? ""} variant="input-button" />
          </InputGroupAddon>
        </InputGroup>
      </div>

      <div className="grid gap-3 rounded-lg border p-4">
        <div className="space-y-1">
          <Label>Suggestion Portal</Label>
          <p className="text-sm text-muted-foreground">
            Publishing makes every request on this project visible to anyone with the link.
          </p>
        </div>

        <InputGroup>
          <InputGroupAddon>
            <InputGroupText>URL</InputGroupText>
          </InputGroupAddon>
          <InputGroupInput value={portalUrl} disabled />
          <InputGroupAddon align="inline-end">
            <CopyButton text={portalUrl} variant="input-button" />
          </InputGroupAddon>
        </InputGroup>

        <div className="flex flex-wrap justify-end gap-2">
          {project?.suggestionPortalPublishedAt && portalPath ? (
            <Button type="button" variant="outline" asChild>
              <a href={portalPath} target="_blank" rel="noreferrer">
                <ExternalLink />
                Open portal
              </a>
            </Button>
          ) : null}
          {project?.suggestionPortalPublishedAt ? (
            <Button
              type="button"
              variant="outline"
              disabled={!project || isPublishing}
              onClick={() => void handlePortalPublishChange(false)}
            >
              {isPublishing ? "Updating..." : "Unpublish"}
            </Button>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" disabled={!project || isPublishing}>
                  {isPublishing ? "Updating..." : "Publish"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Publish this Suggestion Portal?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Every request on this project will be visible to anyone with the portal link. New requests
                    submitted through the portal will also become visible immediately.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => void handlePortalPublishChange(true)}>
                    Publish portal
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="button" disabled={!project || !isDirty || hasInvalidTitle || isSaving} onClick={handleSave}>
          <Save />
          {isSaving ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
