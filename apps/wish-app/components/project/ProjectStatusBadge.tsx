import { useCallback, useEffect, useState, type FC } from "react";
import Color, { type ColorLike } from "color";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { type Doc } from "@/convex/_generated/dataModel";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  ColorPicker,
  ColorPickerAlpha,
  ColorPickerEyeDropper,
  ColorPickerFormat,
  ColorPickerHue,
  ColorPickerOutput,
  ColorPickerSelection,
} from "../ui/shadcn-io/color-picker";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

interface ProjectStatusBadgeProps {
  status: Doc<'requestStatuses'>;
}

const ProjectStatusBadge: FC<ProjectStatusBadgeProps> = ({ status }) => {
  const initialColor = status.color ?? "#fff";
  const [color, setColor] = useState(initialColor);
  const [isSaving, setIsSaving] = useState(false);
  const isDefault = status.type === "default";
  const isChanging = color !== initialColor;
  const updateStatusColor = useMutation(api.requestStatuses.updateColor);

  useEffect(() => {
    setColor(initialColor);
  }, [initialColor]);


  const handleChange = useCallback((value: ColorLike) => {
    const [r, g, b] = value as number[];
    const colorValue = Color.rgb([r, g, b]).hex().toLowerCase();

    setColor(colorValue);
  }, []);

  const handleSave = useCallback(async () => {
    if (!isChanging || isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      await updateStatusColor({ color, id: status._id });
    } catch {
      toast.error("Could not update color");
    } finally {
      toast.info("Color updated")
      setIsSaving(false);
    }
  }, [color, isChanging, isSaving, status._id, updateStatusColor]);


  const badge = (
    <Badge variant="secondary" className="flex items-center gap-2 pr-3">
      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
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
            className="h-80 max-w-sm rounded-md bg-background shadow-sm"
            defaultValue={initialColor}
            onChange={handleChange}
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
            <Button disabled={isSaving || !isChanging} onClick={() => void handleSave()}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </ColorPicker>
        </PopoverContent>
      </Popover>
    </li>
  );
};

export default ProjectStatusBadge;
