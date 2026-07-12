"use client";

import { Link, useNavigate } from "@tanstack/react-router";
import { api } from "@wish/convex-backend/api";
import { useMutation, useQuery } from "convex/react";
import { ArrowBigUp, Lightbulb, Send } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRequesterIdentity } from "@/hooks/useRequesterIdentity";
import { requestSlug } from "@/lib/slug";

export function PublicRequestSubmitDialog({
  projectSlug,
  defaultTitle = "",
  children,
}: {
  projectSlug: string;
  defaultTitle?: string;
  children: ReactNode;
}) {
  const clientId = useRequesterIdentity();
  const navigate = useNavigate();
  const createRequest = useMutation(api.suggestionPortals.createRequest);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState("");
  const [requesterEmail, setRequesterEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const cleanTitle = title.trim();
  const similarSuggestions = useQuery(
    api.suggestionPortals.getSimilarSuggestions,
    open && cleanTitle.length >= 3
      ? {
          projectSlug,
          text: cleanTitle,
          limit: 5,
        }
      : "skip",
  );

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (nextOpen) {
      setTitle(defaultTitle);
      return;
    }

    if (!isSubmitting) {
      setTitle("");
      setDescription("");
      setRequesterEmail("");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!clientId) {
      toast.error("Unable to prepare requester identity");
      return;
    }

    if (cleanTitle.length < 3) {
      toast.error("Request title must be at least 3 characters");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createRequest({
        projectSlug,
        text: cleanTitle,
        description: description.trim() || undefined,
        requesterEmail: requesterEmail.trim() || undefined,
        clientId,
      });
      toast.success("Request submitted");
      handleOpenChange(false);
      setTitle("");
      setDescription("");
      setRequesterEmail("");
      void navigate({
        to: "/p/$projectSlug/r/$requestId/$requestSlug",
        params: {
          projectSlug,
          requestId: result.requestId,
          requestSlug: requestSlug(cleanTitle),
        },
        search: { q: undefined, status: undefined, sort: "top" },
      });
    } catch (error) {
      console.error(error);
      toast.error("Unable to submit request");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="size-5 text-orange-600" />
            Submit a request
          </DialogTitle>
          <DialogDescription>
            Add a clear title and enough context for the team to understand the problem.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="portal-request-title">Title</Label>
            <Input
              id="portal-request-title"
              value={title}
              maxLength={120}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Let me export reports as CSV"
            />
          </div>

          {similarSuggestions && similarSuggestions.length > 0 ? (
            <div className="space-y-2 rounded-lg border bg-muted/25 p-3">
              <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
                Similar suggestions
              </p>
              <div className="space-y-2">
                {similarSuggestions.map((suggestion) => (
                  <Link
                    key={suggestion._id}
                    className="flex items-start justify-between gap-3 rounded-md bg-background p-3 transition-colors hover:bg-muted"
                    to="/p/$projectSlug/r/$requestId/$requestSlug"
                    params={{
                      projectSlug,
                      requestId: suggestion._id,
                      requestSlug: requestSlug(suggestion.text),
                    }}
                    search={{ q: undefined, status: undefined, sort: "top" }}
                    onClick={() => setOpen(false)}
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm leading-5 font-medium">{suggestion.text}</p>
                      {suggestion.status ? (
                        <Badge variant="secondary" className="text-[10px]">
                          {suggestion.status}
                        </Badge>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                      <ArrowBigUp className="size-3.5" />
                      <span>{suggestion.upvoteCount}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="portal-request-description">Details</Label>
            <Textarea
              id="portal-request-description"
              value={description}
              maxLength={1000}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What are you trying to do? What would this help with?"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="portal-request-email">Email for follow-up</Label>
            <Input
              id="portal-request-email"
              type="email"
              value={requesterEmail}
              onChange={(event) => setRequesterEmail(event.target.value)}
              placeholder="you@example.com"
            />
            <p className="text-xs text-muted-foreground">
              Optional. The project owner may use it to ask a follow-up question.
            </p>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting || !clientId || cleanTitle.length < 3}>
              <Send />
              {isSubmitting ? "Submitting..." : "Submit request"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
