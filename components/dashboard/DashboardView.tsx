"use client";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ScrollArea } from "../ui/scroll-area";
import DashboardProjectCard from "./DashboardProjectCard";

export default function DashboardView() {
  const projects = useQuery(api.projects.getProjectsForUser);

  return (
    <ScrollArea>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 max-md:px-2 p-0.25 sidebar-offset-pl">
        {projects &&
          projects.map((project) => <DashboardProjectCard project={project} key={project._id} />)}
      </div>
    </ScrollArea>
  );
}
