"use client";
import type { ReactElement, ReactNode } from "react";
import type { Id } from "@wish/convex-backend/data-model";

import ProjectApiKeysManager from "./ProjectApiKeysManager";
import ProjectGeneralSettings from "./ProjectGeneralSettings";
import ProjectStatusesManager from "./ProjectStatusesManager";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "../ui/dialog";
import { SettingsView, SettingsContent } from "../settings/SettingsView";


interface ProjectSettingsProps {
  projectID: Id<"projects">;
  children: ReactElement;
}

export default function ProjectSettings({ children, projectID }: ProjectSettingsProps) {
  const sections: Array<{ key: string; label: string; content: ReactNode }> = [
    {
      key: "general",
      label: "General",
      content: <ProjectGeneralSettings projectId={projectID} />,
    },
    {
      key: "statuses",
      label: "Statuses",
      content: <ProjectStatusesManager projectID={projectID} />,
    },
    {
      key: "api",
      label: "API Keys",
      content: <ProjectApiKeysManager projectId={projectID} />,
    },
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="max-h-[88vh] w-[96vw] overflow-y-auto sm:max-w-none sm:w-[92vw] lg:w-295 xl:w-330">
        <DialogTitle className="sr-only">Project settings</DialogTitle>
        <DialogDescription className="sr-only">
          Manage the project name, statuses, and API keys.
        </DialogDescription>

        <SettingsView navigation={sections.map(({ key, label }) => ({ key, label }))}>
          {sections.map((section) => (
            <SettingsContent key={section.key} value={section.key}>
              {section.content}
            </SettingsContent>
          ))}
        </SettingsView>
      </DialogContent>
    </Dialog>
  );
}
