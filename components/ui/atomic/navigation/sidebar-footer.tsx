import { LogOut } from "lucide-react";
import { UserProfileCard } from "@/components/ui/atomic/data-display/user-profile-card";
import { UserAvatar } from "@/components/ui/atomic/data-display/user-avatar";
import { UserInfo } from "@/components/ui/atomic/data-display/user-info";
import { IconButton } from "@/components/ui/atomic/buttons/icon-button";

interface SidebarFooterProps {
  userName: string;
  userEmail: string;
  userAvatar?: string;
  onLogout: () => void;
}

export function SidebarFooter({
  userName,
  userEmail,
  userAvatar,
  onLogout,
}: SidebarFooterProps) {
  return (
    <div className="mt-auto">
      <UserProfileCard>
        <UserAvatar src={userAvatar} name={userName} size="md" />
        <UserInfo name={userName} email={userEmail} />
        <IconButton
          icon={LogOut}
          onClick={onLogout}
          variant="primary"
          size="md"
          title="Cerrar sesión"
        />
      </UserProfileCard>
    </div>
  );
}
