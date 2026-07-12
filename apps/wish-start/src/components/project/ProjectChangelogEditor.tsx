"use client";

import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import {
  CHANGELOG_FEATURE_ICONS,
  ChangelogFeatureIcon,
} from "@/components/project/ChangelogFeatureIcon";
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

function emptyFeature() {
  return { id: crypto.randomUUID(), title: "", description: "", icon: "sparkles" };
}

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
    features?: Array<{ title: string; description?: string; icon?: string }>;
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
    features: Array<{ title: string; description?: string; icon?: string }>;
  }) => Promise<void>;
}) {
  const [versionLabel, setVersionLabel] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [features, setFeatures] = useState([emptyFeature()]);

  useEffect(() => {
    if (!entry) {
      setVersionLabel("");
      setTitle("");
      setSummary("");
      setFeatures([emptyFeature()]);
      return;
    }

    setVersionLabel(entry.versionLabel);
    setTitle(entry.title);
    setSummary(entry.summary ?? "");
    setFeatures(
      entry.features?.length
        ? entry.features.map((feature) => ({
            ...feature,
            description: feature.description ?? "",
            icon: feature.icon ?? "sparkles",
            id: crypto.randomUUID(),
          }))
        : entry.body || entry.summary
          ? [
              {
                id: crypto.randomUUID(),
                title: entry.title,
                description: entry.body ?? "",
                icon: "sparkles",
              },
            ]
          : [emptyFeature()],
    );
  }, [entry]);

  async function handleSave() {
    await onSave({
      versionLabel,
      title,
      summary,
      type: "feature",
      features: features.map(({ title: featureTitle, description, icon }) => ({
        title: featureTitle,
        description,
        icon,
      })),
    });
  }

  const isCompletelyEmpty =
    versionLabel.trim().length === 0 &&
    title.trim().length === 0 &&
    summary.trim().length === 0 &&
    features.every(
      (feature) => feature.title.trim().length === 0 && feature.description.trim().length === 0,
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {entry?.status === "published" ? "Edit published entry" : "Edit draft"}
          </DialogTitle>
          <DialogDescription>
            Add each user-facing change as a separate feature. Keep titles short and descriptions
            focused on what users can now do.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
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
            <Label htmlFor="changelog-title">Title</Label>
            <Input
              id="changelog-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="A faster, clearer way to plan"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="changelog-summary">Summary</Label>
            <Textarea
              id="changelog-summary"
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              placeholder="Optional introduction to this release."
              rows={3}
            />
          </div>

          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <Label>Features</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFeatures((current) => [...current, emptyFeature()])}
              >
                <Plus />
                Add feature
              </Button>
            </div>

            {features.map((feature, index) => (
              <div key={feature.id} className="grid gap-3 rounded-xl border bg-muted/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">Feature {index + 1}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove feature ${index + 1}`}
                    disabled={features.length === 1}
                    onClick={() =>
                      setFeatures((current) => current.filter((item) => item.id !== feature.id))
                    }
                  >
                    <Trash2 />
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-[140px_minmax(0,1fr)]">
                  <Select
                    value={feature.icon}
                    onValueChange={(icon) =>
                      setFeatures((current) =>
                        current.map((item) =>
                          item.id === feature.id ? { ...item, icon } : item,
                        ),
                      )
                    }
                  >
                    <SelectTrigger aria-label={`Feature ${index + 1} icon`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CHANGELOG_FEATURE_ICONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <ChangelogFeatureIcon name={option.value} />
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    aria-label={`Feature ${index + 1} title`}
                    value={feature.title}
                    placeholder="Saved views"
                    onChange={(event) =>
                      setFeatures((current) =>
                        current.map((item) =>
                          item.id === feature.id ? { ...item, title: event.target.value } : item,
                        ),
                      )
                    }
                  />
                </div>
                <Textarea
                  aria-label={`Feature ${index + 1} description`}
                  value={feature.description}
                  placeholder="Explain what changed and why it matters."
                  rows={3}
                  onChange={(event) =>
                    setFeatures((current) =>
                      current.map((item) =>
                        item.id === feature.id ? { ...item, description: event.target.value } : item,
                      ),
                    )
                  }
                />
              </div>
            ))}
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
