"use client";
import { useQuery } from "convex/react";
import type { PropsWithChildren } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

import CopyButton from "../Organisms/CopyButton";
import ProjectApiKeysManager from "./ProjectApiKeysManager";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "../ui/input-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import ProjectStatusesManager from "./ProjectStatusesManager";


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
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="w-[96vw] sm:w-[92vw] lg:w-295 xl:w-330 sm:max-w-none max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{project?.title}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="general" className="gap-4">
          <TabsList className="w-full justify-start md:w-fit">
            {
              SECTION_LIST.map((section) => (
                <TabsTrigger value={section.key} key={section.key}>{section.label}</TabsTrigger>
              ))
            }
          </TabsList>

          <TabsContent value={SECTIONS.general.key} className="space-y-6">
            <InputGroup>
              <InputGroupAddon>
                <InputGroupText>ID</InputGroupText>
              </InputGroupAddon>
              <InputGroupInput value={`${project?._id}`} disabled={true} />
              <InputGroupAddon align="inline-end">
                <CopyButton text={project?._id ?? ""} variant="input-button" />
              </InputGroupAddon>
            </InputGroup>
          </TabsContent>

          <TabsContent value={SECTIONS.settings.key}>
            <ProjectStatusesManager projectID={projectID} />
          </TabsContent>

          <TabsContent value={SECTIONS.api.key}>
            <ProjectApiKeysManager projectId={projectID} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
