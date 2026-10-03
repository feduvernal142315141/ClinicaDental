import Link from "next/link";
import { buttonVariants } from "@/components/ui";
import { cn } from "@/lib/utils/utils";

interface LinkButtonProps extends React.ComponentProps<typeof Link> {
  variant?: "default" | "outline" | "ghost" | "link";
  size?: "default" | "sm" | "lg";
}

/** Enlace con aspecto de botón (el `Button` del kit no admite `asChild`). */
export function LinkButton({ variant = "default", size = "default", className, ...props }: LinkButtonProps) {
  return <Link className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
