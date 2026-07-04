import { Copy } from "lucide-react";
import type { ComponentProps, PropsWithChildren } from "react";
import { toast } from "sonner";

import { copyToClipboard } from "@/lib/text";
import { cn } from "@/lib/utils";

import { Button } from "../ui/button";
import { InputGroupButton } from "../ui/input-group";

interface CopyButtonProps extends PropsWithChildren {
  text: string;
  variant?: "default" | "input-button";
  className?: string;
}
export default function CopyButton({
  children,
  text,
  variant = "default",
  className,
}: CopyButtonProps) {
  async function handleCopyClick() {
    try {
      await copyToClipboard(text);
      toast.info("Copied successfully");
    } catch {
      toast.error("Error during copy");
    }
  }

  const Wrapper = variant === "default" ? Button : InputGroupButton;
  const sizeMap: Record<
    NonNullable<CopyButtonProps["variant"]>,
    ComponentProps<typeof Button>["size"] | ComponentProps<typeof InputGroupButton>["size"]
  > = {
    default: "icon",
    "input-button": "icon-xs",
  };

  return (
    <Wrapper
      variant="ghost"
      className={cn("relative z-1", className)}
      size={sizeMap[variant] as any}
      onClick={() => void handleCopyClick()}
    >
      {children?.toString ? <div>{children}</div> : <Copy size={12} />}
    </Wrapper>
  );
}
