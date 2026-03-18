import { type FC } from 'react';
import StatusCreationView from '../Status/StatusCreationView';
import { Button } from '../ui/button';
import { useQuery } from 'convex/react';
import { api } from '@wish/convex-backend/api';
import type { Id } from '@wish/convex-backend/data-model';
import ProjectStatusBadge from './ProjectStatusBadge';


interface ProjectStatusesManagerProps {
  projectID: Id<"projects">;
}

const ProjectStatusesManager: FC<ProjectStatusesManagerProps> = ({ projectID }) => {
  const requestStatuses = useQuery(api.requestStatuses.getByProject, { id: projectID });

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3>Statuses</h3>
        <StatusCreationView projectId={projectID} defaultColor="#fff">
          <Button type="button">New status</Button>
        </StatusCreationView>
      </div>
      <ul className="space-y-2">
        {requestStatuses &&
          requestStatuses.map((status) => {
            return <ProjectStatusBadge key={status._id} status={status} />;
          })}
      </ul>
    </>
  );
};

export default ProjectStatusesManager;
