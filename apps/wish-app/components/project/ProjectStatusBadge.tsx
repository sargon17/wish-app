import { useCallback, useEffect, useMemo, useState, type FC } from 'react';
import { Badge } from '../ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { ColorPicker, ColorPickerSelection, ColorPickerEyeDropper, ColorPickerHue, ColorPickerAlpha, ColorPickerOutput, ColorPickerFormat } from '../ui/shadcn-io/color-picker';
import { Doc } from '@/convex/_generated/dataModel';
import Color, { ColorLike } from 'color';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Button } from '../ui/button';

interface ProjectStatusBadgeProps {
  status: Doc<'requestStatuses'>;
}

const ProjectStatusBadge: FC<ProjectStatusBadgeProps> = ({ status }) => {

  const [color, setColor] = useState<ColorLike | undefined>(undefined)

  const initialColor = useMemo(() => status.color ?? '#f97316', [status]);
  const isDefault = useMemo(() => status.type === "default", []);
  const isChanging = useMemo(() => color !== initialColor, [color]);

  const updateStatusColor = useMutation(api.requestStatuses.updateColor);


  // const fallbackColor = useMemo(() => "#f97316", [])
  // const [isSaving, setSaving] = useState<Boolean>(false)
  // const [targetColor, setTargetColor] = useState<string | null>(null)
  // const color = useMemo(() => status.color ?? fallbackColor, [status.color, fallbackColor]);
  // const colorSaveTimeout = useRef<Record<string, NodeJS.Timeout>>({});
  // const pendingColorValue = useRef<Record<string, string>>({});
  // const lastSavedColor = useRef<Record<string, string>>({});


  const badge = (
    <Badge variant="secondary" className="flex items-center gap-2 pr-3">
      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color?.toString() }} />
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


  // const scheduleColorSave = useCallback(
  //   async (statusId: Id<"requestStatuses">, color: string) => {
  //     console.log("reschedule", statusId, color);

  //     pendingColorValue.current[statusId] = color;

  //     if (colorSaveTimeout.current[statusId]) {
  //       clearTimeout(colorSaveTimeout.current[statusId]);
  //     }

  //     colorSaveTimeout.current[statusId] = setTimeout(async () => {
  //       setSaving(true);
  //       try {
  //         const nextColor = pendingColorValue.current[statusId];
  //         if (nextColor) {
  //           await updateStatusColor({ id: statusId, color: nextColor });
  //           lastSavedColor.current[statusId] = nextColor;
  //         }
  //       } catch (error) {
  //         console.error(error);
  //         toast.error("Could not update color");
  //       } finally {
  //         setSaving(false);
  //         delete pendingColorValue.current[statusId];
  //         delete colorSaveTimeout.current[statusId];
  //       }
  //     }, 250);
  //   },
  //   [updateStatusColor],
  // );

  // const handleColorChange = useCallback(
  //   (currentColor: string) => (value: Parameters<typeof Color.rgb>[0]) => {
  //     const [r, g, b] = value as number[];
  //     const colorValue = Color.rgb([r, g, b])
  //       .hex()
  //       .toLowerCase();

  //     if (colorValue === targetColor) return
  //     if (targetColor === null && colorValue === color) return

  //     setTargetColor(colorValue)
  //   },
  //   [targetColor, color],
  // );
  //


  // const handleChange = useCallback((value: ColorLike) => {
  //   const [r, g, b] = value as number[];
  //   const colorValue = Color.rgb([r, g, b])
  //     .hex()
  //     .toLowerCase();


  //   setColor(colorValue)
  // }, []);

  const handleSave = useCallback(() => {
    if (!isChanging || color === undefined) return
    updateStatusColor({ color: color.toString(), id: status._id })
  }, [color]);

  useEffect(() => {
    console.log("color", color)
  }, [color]);

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
            className="max-w-sm rounded-md bg-background shadow-sm h-80"
            value={color}
            defaultValue={status.color}
            onChange={(v) => setColor(v)}
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
            {
              isChanging && (
                <Button onClick={handleSave}>Save</Button>
              )
            }
          </ColorPicker>
        </PopoverContent>
      </Popover>
    </li>
  );
};

export default ProjectStatusBadge;
