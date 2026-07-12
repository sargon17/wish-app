import { converter, formatHex, wcagContrast } from "culori";

const toOklch = converter("oklch");

export function contrastShade(color: string) {
  const parsed = toOklch(color);
  if (!parsed) return color;

  const dark = formatHex({ ...parsed, l: 0.18 });
  const light = formatHex({ ...parsed, l: 0.92 });

  return wcagContrast(dark, color) > wcagContrast(light, color) ? dark : light;
}

export function lighten(color: string, amount = 0.1) {
  const parsed = toOklch(color);
  if (!parsed) return color;

  return formatHex({
    ...parsed,
    l: Math.min(1, parsed.l + amount),
  });
}

export function darken(color: string, amount = 0.1) {
  const parsed = toOklch(color);
  if (!parsed) return color;

  return formatHex({
    ...parsed,
    l: Math.max(0, parsed.l - amount),
  });
}
