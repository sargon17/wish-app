import {
  Bug,
  ChartNoAxesColumnIncreasing,
  Rocket,
  ShieldCheck,
  Sparkles,
  WandSparkles,
  Zap,
} from "lucide-react";

export const CHANGELOG_FEATURE_ICONS = [
  { value: "sparkles", label: "Sparkles", icon: Sparkles },
  { value: "rocket", label: "Rocket", icon: Rocket },
  { value: "zap", label: "Zap", icon: Zap },
  { value: "shield", label: "Shield", icon: ShieldCheck },
  { value: "chart", label: "Chart", icon: ChartNoAxesColumnIncreasing },
  { value: "magic", label: "Magic", icon: WandSparkles },
  { value: "bug", label: "Bug fix", icon: Bug },
] as const;

export function ChangelogFeatureIcon({ name }: { name?: string }) {
  const Icon = CHANGELOG_FEATURE_ICONS.find((option) => option.value === name)?.icon ?? Sparkles;

  return <Icon aria-hidden="true" />;
}
