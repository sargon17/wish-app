import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { api } from "@wish/convex-backend/api";

export default function useProjects() {
  const {
    data: projects,
    isPending,
    error,
  } = useQuery(convexQuery(api.projects.getProjectsForUser));

  return {
    projects,
    isPending,
    error,
  };
}
