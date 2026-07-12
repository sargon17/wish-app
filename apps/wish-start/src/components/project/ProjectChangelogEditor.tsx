"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const CHANGELOG_TYPES = ["feature", "improvement", "fix"] as const;

export default function ProjectChangelogEditor({
  entry,
  open,
  isSaving,
  onOpenChange,
  onSave,
}: {
  entry: {
    versionLabel: string;
    title: string;
    summary?: string;
    body?: string;
    type: "feature" | "improvement" | "fix";
    status: "draft" | "published";
  } | null;
  open: boolean;
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (values: {
    versionLabel: string;
    title: string;
    summary?: string;
    body?: string;
    type: "feature" | "improvement" | "fix";
  }) => Promise<void>;
}) {
  const [versionLabel, setVersionLabel] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<(typeof CHANGELOG_TYPES)[number]>("feature");

  useEffect(() => {
    if (!entry) {
      setVersionLabel("");
      setTitle("");
      setSummary("");
      setBody("");
      setType("feature");
      return;
    }

    setVersionLabel(entry.versionLabel);
    setTitle(entry.title);
    setSummary(entry.summary ?? "");
    setBody(entry.body ?? "");
    setType(entry.type);
  }, [entry]);

  async function handleSave() {
    await onSave({
      versionLabel,
      title,
      summary,
      body,
      type,
    });
  }

  const isCompletelyEmpty =
    versionLabel.trim().length === 0 &&
    title.trim().length === 0 &&
    summary.trim().length === 0 &&
    body.trim().length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {entry?.status === "published" ? "Edit published entry" : "Edit draft"}
          </DialogTitle>
          <DialogDescription>
            Keep the release title tight. The body should explain what changed in plain language.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
            <div className="grid gap-2">
              <Label htmlFor="changelog-version-label">Version label</Label>
              <Input
                id="changelog-version-label"
                value={versionLabel}
                onChange={(event) => setVersionLabel(event.target.value)}
                placeholder="v2.4.1"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="changelog-type">Type</Label>
              <Select
                value={type}
                onValueChange={(value) => setType(value as (typeof CHANGELOG_TYPES)[number])}
              >
                <SelectTrigger id="changelog-type">
                  <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent>
                  {CHANGELOG_TYPES.map((item) => (
                    <SelectItem key={item} value={item} className="capitalize">
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="changelog-title">Title</Label>
            <Input
              id="changelog-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Faster search across large wishlists"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="changelog-summary">Summary</Label>
            <Textarea
              id="changelog-summary"
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              placeholder="One short paragraph for the changelog list and hosted page preview."
              rows={3}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="changelog-body">Body</Label>
            <Textarea
              id="changelog-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Explain what shipped, why it matters, and what users should notice."
              rows={10}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            type="button"
            disabled={!entry || isSaving || isCompletelyEmpty}
            onClick={handleSave}
          >
            {isSaving ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
