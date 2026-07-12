import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@components/ui/empty";
import type { Id } from "@wish/convex-backend/data-model";
import { TableProperties } from "lucide-react";

import { RequestsCreateEditButton } from "./RequestCreateEditDialog";

interface RequestsEmptyProps {
  projectId: Id<"projects">;
}

const RequestsEmpty = ({ projectId }: RequestsEmptyProps) => {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <TableProperties />
        </EmptyMedia>
        <EmptyTitle>No Requests Yet</EmptyTitle>
        <EmptyDescription>We couldn't find any requests for this project.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <RequestsCreateEditButton projectId={projectId as never} />
      </EmptyContent>
    </Empty>
  );
};

export default RequestsEmpty;
