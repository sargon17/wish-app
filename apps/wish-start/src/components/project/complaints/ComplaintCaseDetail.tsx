"use client";

import { useMutation, useQuery } from "convex/react";
import { CheckCircle2, ClipboardList, Mail, Save, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import CommentsPanel from "@/components/Request/Comments/CommentsPanel";
import RequestCardActions from "@/components/Request/RequestCardActions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@wish/convex-backend/api";
import type { Doc, Id } from "@wish/convex-backend/data-model";

import {
  complaintCategories,
  complaintOutcomeLabels,
  complaintOutcomes,
  complaintSeverities,
  complaintStageLabels,
  complaintStages,
  defaultComplaintEta,
  formatDateTime,
  fromDateTimeLocalValue,
  isComplaintOverdue,
  isComplaintOutcome,
  isComplaintSeverity,
  isComplaintStage,
  terminalComplaintStages,
  toDateTimeLocalValue,
} from "./complaintCaseHelpers";

type ComplaintCase = Doc<"requests"> & {
  complaintStage: string;
  ownerName?: string;
  commentCount: number;
};
type ComplaintStage = (typeof complaintStages)[number];
type ComplaintSeverity = (typeof complaintSeverities)[number];
type ComplaintOutcome = (typeof complaintOutcomes)[number];

export function ComplaintCaseDetail({
  complaint,
  currentUser,
}: {
  complaint: ComplaintCase | undefined;
  currentUser: { _id: Id<"users">; name: string };
}) {
  const updateComplaintCase = useMutation(api.complaintCases.update);
  const events = useQuery(
    api.complaintCases.getEvents,
    complaint ? { requestId: complaint._id } : "skip",
  );
  const [stage, setStage] = useState<ComplaintStage>("new");
  const [severity, setSeverity] = useState<ComplaintSeverity | "">("");
  const [category, setCategory] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [eta, setEta] = useState("");
  const [outcome, setOutcome] = useState<ComplaintOutcome | "">("");
  const [outcomeSummary, setOutcomeSummary] = useState("");
  const [handoffReason, setHandoffReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!complaint) return;

    setStage(isComplaintStage(complaint.complaintStage) ? complaint.complaintStage : "new");
    setSeverity(isComplaintSeverity(complaint.complaintSeverity) ? complaint.complaintSeverity : "");
    setCategory(complaint.complaintCategory ?? "");
    setOwnerId(complaint.complaintOwnerUserId ?? "");
    setEta(toDateTimeLocalValue(complaint.complaintFirstResponseDueAt));
    setOutcome(isComplaintOutcome(complaint.complaintOutcome) ? complaint.complaintOutcome : "");
    setOutcomeSummary(complaint.complaintOutcomeSummary ?? "");
    setHandoffReason("");
  }, [complaint]);

  const isTerminal = terminalComplaintStages.has(stage);
  const isDirty = useMemo(() => {
    if (!complaint) return false;

    return (
      stage !== (complaint.complaintStage ?? "new") ||
      severity !== (complaint.complaintSeverity ?? "") ||
      category !== (complaint.complaintCategory ?? "") ||
      ownerId !== (complaint.complaintOwnerUserId ?? "") ||
      eta !== toDateTimeLocalValue(complaint.complaintFirstResponseDueAt) ||
      outcome !== (complaint.complaintOutcome ?? "") ||
      outcomeSummary !== (complaint.complaintOutcomeSummary ?? "") ||
      (ownerId !== (complaint.complaintOwnerUserId ?? "") && handoffReason.trim().length > 0)
    );
  }, [category, complaint, eta, handoffReason, outcome, outcomeSummary, ownerId, severity, stage]);

  if (!complaint) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">
        Select a complaint to manage.
      </div>
    );
  }

  async function handleSave() {
    if (!complaint || isSaving) return;

    setIsSaving(true);
    try {
      await updateComplaintCase({
        id: complaint._id,
        stage,
        severity: severity || undefined,
        category: category || undefined,
        ownerUserId: ownerId ? ownerId as Id<"users"> : undefined,
        firstResponseDueAt: fromDateTimeLocalValue(eta),
        outcome: isTerminal && outcome ? outcome : undefined,
        outcomeSummary: isTerminal ? outcomeSummary : undefined,
        handoffReason: handoffReason || undefined,
      });
      toast.success("Complaint case updated");
      setHandoffReason("");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Unable to update complaint");
    } finally {
      setIsSaving(false);
    }
  }

  function triageToMe() {
    setStage("triaged");
    setOwnerId(currentUser._id);
    setSeverity(severity || "S2");
    setCategory(category || "Product defect");
    setEta(eta || toDateTimeLocalValue(defaultComplaintEta()));
  }

  const overdue = isComplaintOverdue(complaint.complaintStage, complaint.complaintFirstResponseDueAt);

  return (
    <div className="flex min-h-0 flex-col rounded-lg border bg-card">
      <div className="space-y-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={overdue ? "destructive" : "secondary"}>
                {overdue ? "Overdue" : complaintStageLabels[complaint.complaintStage] ?? "New"}
              </Badge>
              {complaint.complaintSeverity ? (
                <Badge variant={complaint.complaintSeverity === "S1" ? "destructive" : "outline"}>
                  {complaint.complaintSeverity}
                </Badge>
              ) : null}
            </div>
            <h2 className="text-xl font-semibold tracking-tight">{complaint.text}</h2>
          </div>
          <RequestCardActions request={complaint} alwaysVisible label="Complaint" />
        </div>

        <div className="grid gap-2 text-sm text-muted-foreground">
          {complaint.requesterEmail ? (
            <a className="inline-flex w-fit items-center gap-2 hover:text-foreground" href={`mailto:${complaint.requesterEmail}`}>
              <Mail className="size-4" />
              {complaint.requesterEmail}
            </a>
          ) : null}
          <span className="inline-flex items-center gap-2">
            <UserRound className="size-4" />
            {complaint.ownerName ?? "Unassigned"} / client {complaint.clientId}
          </span>
          <p className="whitespace-pre-wrap leading-6">{complaint.description || "No complaint details provided."}</p>
        </div>
      </div>

      <Separator />

      <ScrollArea className="min-h-0 flex-1">
        <div className="grid gap-6 p-4">
          <section className="grid gap-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ClipboardList className="size-4 text-muted-foreground" />
                <h3 className="font-medium">Triage contract</h3>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={triageToMe}>
                Assign to me
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Stage</Label>
                <Select
                  value={stage}
                  onValueChange={(value) => {
                    if (isComplaintStage(value)) setStage(value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {complaintStages.map((item) => (
                      <SelectItem key={item} value={item}>
                        {complaintStageLabels[item]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Owner</Label>
                <Select value={ownerId || "unassigned"} onValueChange={(value) => setOwnerId(value === "unassigned" ? "" : value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    <SelectItem value={currentUser._id}>{currentUser.name}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Severity</Label>
                <Select
                  value={severity || "unset"}
                  onValueChange={(value) => {
                    if (value === "unset") setSeverity("");
                    if (isComplaintSeverity(value)) setSeverity(value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unset">Unset</SelectItem>
                    {complaintSeverities.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Category</Label>
                <Select value={category || "unset"} onValueChange={(value) => setCategory(value === "unset" ? "" : value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unset">Unset</SelectItem>
                    {complaintCategories.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="complaint-first-response">First response ETA</Label>
                <Input
                  id="complaint-first-response"
                  type="datetime-local"
                  value={eta}
                  onChange={(event) => setEta(event.target.value)}
                />
              </div>

              {ownerId !== (complaint.complaintOwnerUserId ?? "") ? (
                <div className="grid gap-2 md:col-span-2">
                  <Label htmlFor="complaint-handoff">Handoff reason</Label>
                  <Textarea
                    id="complaint-handoff"
                    value={handoffReason}
                    onChange={(event) => setHandoffReason(event.target.value)}
                    placeholder="Why is custody changing?"
                  />
                </div>
              ) : null}
            </div>
          </section>

          {isTerminal ? (
            <section className="grid gap-3 rounded-lg border bg-muted/20 p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-muted-foreground" />
                <h3 className="font-medium">Resolution evidence</h3>
              </div>
              <div className="grid gap-3">
                <div className="grid gap-2">
                  <Label>Outcome</Label>
                  <Select
                    value={outcome || "unset"}
                    onValueChange={(value) => {
                      if (value === "unset") setOutcome("");
                      if (isComplaintOutcome(value)) setOutcome(value);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unset">Unset</SelectItem>
                      {complaintOutcomes.map((item) => (
                        <SelectItem key={item} value={item}>
                          {complaintOutcomeLabels[item]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="complaint-outcome-summary">Summary</Label>
                  <Textarea
                    id="complaint-outcome-summary"
                    value={outcomeSummary}
                    onChange={(event) => setOutcomeSummary(event.target.value)}
                    placeholder="What happened, and what should happen next?"
                  />
                </div>
              </div>
            </section>
          ) : null}

          <div className="flex justify-end">
            <Button type="button" disabled={!isDirty || isSaving} onClick={handleSave}>
              {isSaving ? <Spinner /> : <Save />}
              {isSaving ? "Saving..." : "Save case"}
            </Button>
          </div>

          <Separator />

          <CommentsPanel request={complaint} />

          <Separator />

          <section className="grid gap-3">
            <h3 className="font-medium">Custody history</h3>
            {events === undefined ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Spinner />
                Loading history
              </div>
            ) : events.length === 0 ? (
              <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No case events yet.
              </p>
            ) : (
              <div className="grid gap-2">
                {events.map((event) => (
                  <div key={event._id} className="rounded-lg border p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium capitalize">{event.type}</span>
                      <span className="text-xs text-muted-foreground">{formatDateTime(event.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      {event.fromOwnerName || event.fromStage || "None"} {"->"} {event.toOwnerName || event.toStage || "None"}
                    </p>
                    {event.reason ? <p className="mt-1">{event.reason}</p> : null}
                    <p className="mt-1 text-xs text-muted-foreground">By {event.createdByName}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </ScrollArea>
    </div>
  );
}
