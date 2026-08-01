import { Button } from "@/components/ui/button";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";

export default function RequestSubmissionControls({
  isSubmitting,
  isEditMode,
  errorMessage,
}: {
  isSubmitting: boolean;
  isEditMode: boolean;
  errorMessage?: string;
}) {
  return (
    <>
      {errorMessage ? (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline" disabled={isSubmitting}>
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (isEditMode ? "Saving…" : "Creating…") : isEditMode ? "Save" : "Create"}
        </Button>
      </DialogFooter>
    </>
  );
}
