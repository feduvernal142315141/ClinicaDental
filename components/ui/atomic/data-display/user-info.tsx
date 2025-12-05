import { cn } from "@/lib/utils/utils";

interface UserInfoProps {
  name: string;
  email: string;
  className?: string;
}

export function UserInfo({ name, email, className }: UserInfoProps) {
  return (
    <div className={cn("flex-1 min-w-0", className)}>
      <p className="text-sm font-medium truncate">{name}</p>
      <p className="text-xs text-muted-foreground truncate">{email}</p>
    </div>
  );
}
