import { contrastShade, darken, lighten } from "#/lib/color.ts";
import { useTheme } from "next-themes";

type StatusChipProps = {
  label: string;
  color: string;
};

const StatusChip = ({ label, color }: StatusChipProps) => {
  const { resolvedTheme } = useTheme();

  let backgroundColor = resolvedTheme === "light" ? darken(color, 0.4) : lighten(color, 0.05);

  return (
    <div
      className="inline rounded-sm p-1 py-px"
      style={{
        backgroundColor: backgroundColor,
      }}
    >
      <span
        className=""
        style={{
          color: contrastShade(backgroundColor),
        }}
      >
        {label}
      </span>
    </div>
  );
};

export default StatusChip;
