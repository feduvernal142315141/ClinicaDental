import { cn } from "@/lib/utils/utils";

interface UserAvatarProps {
  src?: string;
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
};

export function UserAvatar({
  src,
  name,
  size = "md",
  className,
}: UserAvatarProps) {
  const initials = name
    .split(" ")
    .map((n) => n.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={cn(
        "rounded-full bg-primary/20 flex items-center justify-center shrink-0 overflow-hidden",
        sizeClasses[size],
        className
      )}
    >
      {src ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span className="font-semibold text-primary">{initials}</span>
      )}
    </div>
  );
}
