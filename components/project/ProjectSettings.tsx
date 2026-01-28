"use client";
import type { PropsWithChildren } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import Color from "color";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  ColorPicker,
  ColorPickerAlpha,
  ColorPickerEyeDropper,
  ColorPickerFormat,
  ColorPickerHue,
  ColorPickerOutput,
  ColorPickerSelection,
} from "@/components/ui/shadcn-io/color-picker";

import { api } from "@/convex/_generated/api";

import CopyButton from "../Organisms/CopyButton";
import StatusCreationView from "../Status/StatusCreationView";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "../ui/input-group";

interface ProjectSettingsProps extends PropsWithChildren {
  projectID: Id<"projects">;
}

export default function ProjectSettings({ children, projectID }: ProjectSettingsProps) {
  const project = useQuery(api.projects.getProjectById, { id: projectID });
  const requestStatuses = useQuery(api.requestStatuses.getByProject, { id: projectID });
  const updateStatusColor = useMutation(api.requestStatuses.updateColor);

  const [savingColorFor, setSavingColorFor] = useState<Id<"requestStatuses"> | null>(null);

  const colorSaveTimeout = useRef<Record<string, NodeJS.Timeout>>({});
  const pendingColorValue = useRef<Record<string, string>>({});
  const lastSavedColor = useRef<Record<string, string>>({});

  const fallbackColor = useMemo(() => "#f97316", []);

  const scheduleColorSave = useCallback(
    async (statusId: Id<"requestStatuses">, color: string) => {
      pendingColorValue.current[statusId] = color;

      if (colorSaveTimeout.current[statusId]) {
        clearTimeout(colorSaveTimeout.current[statusId]);
      }

      colorSaveTimeout.current[statusId] = setTimeout(async () => {
        setSavingColorFor(statusId);
        try {
          const nextColor = pendingColorValue.current[statusId];
          if (nextColor) {
            await updateStatusColor({ id: statusId, color: nextColor });
            lastSavedColor.current[statusId] = nextColor;
          }
        } catch (error) {
          console.error(error);
          toast.error("Could not update color");
        } finally {
          setSavingColorFor(null);
          delete pendingColorValue.current[statusId];
          delete colorSaveTimeout.current[statusId];
        }
      }, 250);
    },
    [updateStatusColor],
  );

  const handleColorChange = useCallback(
    (statusId: Id<"requestStatuses">, currentColor: string) => {
      return (value: Parameters<typeof Color.rgb>[0]) => {
        try {
          const [r, g, b, alpha = 1] = value as number[];
          const colorValue = Color.rgb([r, g, b])
            .alpha(alpha ?? 1)
            .hexa()
            .toLowerCase();
          const baseline = (
            pendingColorValue.current[statusId] ??
            lastSavedColor.current[statusId] ??
            currentColor
          ).toLowerCase();

          if (colorValue === baseline) {
            return;
          }

          void scheduleColorSave(statusId, colorValue);
        } catch (error) {
          console.error(error);
          toast.error("Invalid color value");
        }
      };
    },
    [scheduleColorSave],
  );

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="w-[80vw]">
        <DialogHeader>
          <DialogTitle>{project?.title}</DialogTitle>
        </DialogHeader>
        <InputGroup>
          <InputGroupAddon>
            <InputGroupText>ID</InputGroupText>
          </InputGroupAddon>
          <InputGroupInput value={`${project?._id}`} disabled={true} />
          <InputGroupAddon align="inline-end">
            <CopyButton text={project?._id ?? ""} variant="input-button" />
          </InputGroupAddon>
        </InputGroup>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3>Statuses</h3>
          <StatusCreationView projectId={projectID} defaultColor={fallbackColor}>
            <Button type="button">New status</Button>
          </StatusCreationView>
        </div>
        <ul className="gap-2 flex flex-wrap">
          {requestStatuses &&
            requestStatuses.map((status) => {
              const color = status.color ?? fallbackColor;
              const isDefault = status.type === "default";

              const badge = (
                <Badge variant="secondary" className="flex items-center gap-2 pr-3">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  <span>{status.displayName}</span>
                  {isDefault && (
                    <span className="text-[10px] text-muted-foreground uppercase">Default</span>
                  )}
                </Badge>
              );

              if (isDefault) {
                return (
                  <li key={status._id} className="cursor-not-allowed opacity-80">
                    {badge}
                  </li>
                );
              }

              return (
                <li key={status._id}>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button type="button" className="focus-visible:outline-none">
                        {badge}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent>
                      <ColorPicker
                        className="max-w-sm rounded-md border bg-background p-4 shadow-sm h-80"
                        value={color}
                        defaultValue={fallbackColor}
                        onChange={handleColorChange(status._id, color)}
                      >
                        <ColorPickerSelection />
                        <div className="flex items-center gap-4">
                          <ColorPickerEyeDropper />
                          <div className="grid w-full gap-1">
                            <ColorPickerHue />
                            <ColorPickerAlpha />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <ColorPickerOutput />
                          <ColorPickerFormat />
                        </div>
                        {savingColorFor === status._id && (
                          <p className="text-xs text-muted-foreground">Saving color...</p>
                        )}
                      </ColorPicker>
                    </PopoverContent>
                  </Popover>
                </li>
              );
            })}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
