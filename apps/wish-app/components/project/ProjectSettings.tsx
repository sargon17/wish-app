"use client";
import { useQuery } from "convex/react";
import type { PropsWithChildren } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

import CopyButton from "../Organisms/CopyButton";
import ProjectApiKeysManager from "./ProjectApiKeysManager";
import ProjectStatusesManager from "./ProjectStatusesManager";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "../ui/input-group";
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
  const project = useQuery(api.projects.getProjectById, { id: projectID });
  return (
    <SettingsView navigation={SECTION_LIST}>
      <SettingsTrigger asChild>{children}</SettingsTrigger>

      <SettingsContent value={SECTIONS.general.key}>
        {/*TODO: remove this*/}
        <InputGroup>
          <InputGroupAddon>
            <InputGroupText>ID</InputGroupText>
          </InputGroupAddon>
          <InputGroupInput value={`${project?._id}`} disabled={true} />
          <InputGroupAddon align="inline-end">
            <CopyButton text={project?._id ?? ""} variant="input-button" />
          </InputGroupAddon>
        </InputGroup>
        {/*TODO: remove this*/}
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
