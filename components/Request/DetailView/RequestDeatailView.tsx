import { User } from "lucide-react";
import type { ReactNode } from "react";

import StatusForwardBadge from "@/components/Status/StatusForwardBadge";
import RequestUpvoteButton from "@/components/Request/RequestUpvoteButton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Doc } from "@/convex/_generated/dataModel";
import { useRequestStatus } from "@/hooks/useRequestStatus";

interface Props {
  children: ReactNode;
  request: Doc<"requests">;
  isUpvoted: boolean;
  upvoteCount: number;
}

export default function RequestDetailView({ children, request, isUpvoted, upvoteCount }: Props) {
  const requestStatus = useRequestStatus({ request });

  const handleSave = () => {
    requestStatus.methods.save();
  };

  // const isToSave = isStatusChanged

  const hasChanges = requestStatus.state.hasChanged;

  return (
    <Dialog>
      <DialogTrigger asChild className="cursor-pointer">
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-106.25 md:max-w-3xl">
        <DialogHeader>
          <div className="flex items-center gap-4 ">
            <DialogTitle className="capitalize">{request.text}</DialogTitle>
            <RequestUpvoteButton
              requestId={request._id}
              projectId={request.project}
              upvoteCount={upvoteCount}
              isUpvoted={isUpvoted}
              size="default"
            />
            {requestStatus.state.current && <StatusForwardBadge status={requestStatus} />}
          </div>
          <div>
            <div className="*:flex *:gap-2 *:items-center flex gap-2 text-foreground/50 text-sm mb-8">
              <div>
                <User size={16} />
                {request.clientId}
              </div>
              <div className="text-foreground/20">/</div>
              <div>
                <p>ID:</p>
                {request._id}
              </div>
            </div>
            <div>
              <p className="text-secondary-foreground text-sm">{request.description}</p>
            </div>
          </div>
        </DialogHeader>

        <DialogFooter>{hasChanges && <Button onClick={handleSave}>Save</Button>}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
