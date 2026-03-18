"use client";
import type { PropsWithChildren } from "react";
import type { Id } from "@wish/convex-backend/data-model";

import ProjectApiKeysManager from "./ProjectApiKeysManager";
import ProjectGeneralSettings from "./ProjectGeneralSettings";
import ProjectStatusesManager from "./ProjectStatusesManager";
import { SettingsView, SettingsContent, SettingsTrigger } from "../settings/SettingsView";


const SECTIONS = {
  general: { key: "general", label: "General" },
  settings: { key: "settings", label: "Settings" },
  api: { key: "api", label: "API Keys" },
} as const;

const SECTION_LIST = Object.values(SECTIONS)

interface ProjectSettingsProps extends PropsWithChildren {
  projectID: Id<"projects">;
}

export default function ProjectSettings({ children, projectID }: ProjectSettingsProps) {
  return (
    <SettingsView navigation={SECTION_LIST}>
      <SettingsTrigger asChild>{children}</SettingsTrigger>

      <SettingsContent value={SECTIONS.general.key}>
        <ProjectGeneralSettings projectId={projectID} />
      </SettingsContent>

      <SettingsContent value={SECTIONS.settings.key}>
        <ProjectStatusesManager projectID={projectID} />
      </SettingsContent>

      <SettingsContent value={SECTIONS.api.key}>
        <ProjectApiKeysManager projectId={projectID} />
      </SettingsContent>
    </SettingsView>
  );
}
