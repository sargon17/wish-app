"use client";
import type { Id } from "@wish/convex-backend/data-model";
import type { ReactElement, ReactNode } from "react";

import { SettingsView, SettingsContent } from "../settings/SettingsView";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "../ui/dialog";

import ProjectApiKeysManager from "./ProjectApiKeysManager";
import ProjectGeneralSettings from "./ProjectGeneralSettings";
import ProjectNotificationConnectorsManager from "./ProjectNotificationConnectorsManager";
import ProjectStatusesManager from "./ProjectStatusesManager";

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
    {
      key: "connectors",
      label: "Connectors",
      content: <ProjectNotificationConnectorsManager projectId={projectID} />,
    },
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="max-h-[88vh] w-[96vw] overflow-y-auto sm:w-[92vw] sm:max-w-none lg:w-295 xl:w-330">
        <DialogTitle className="sr-only">Project settings</DialogTitle>
        <DialogDescription className="sr-only">
          Manage the project name, statuses, API keys, and notification connectors.
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
