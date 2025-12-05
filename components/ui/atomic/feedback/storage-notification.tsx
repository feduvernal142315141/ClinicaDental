import { ProgressCircle } from "@/components/ui/atomic/feedback/progress-circle";
import { NotificationCard } from "@/components/ui/atomic/feedback/notification-card";
import { Button } from "@/components/ui/primitives/shadcn/button";

interface StorageNotificationProps {
  usedPercentage: number;
  onDismiss?: () => void;
  onUpgrade?: () => void;
}

export function StorageNotification({
  usedPercentage,
  onDismiss,
  onUpgrade,
}: StorageNotificationProps) {
  return (
    <NotificationCard variant="info">
      <div className="flex flex-col items-start gap-3">
        <ProgressCircle value={usedPercentage} size="md">
          <span className="text-sm font-bold text-accent">
            {usedPercentage}%
          </span>
        </ProgressCircle>

        <div>
          <h4 className="text-sm font-semibold text-foreground mb-1">
            Used space
          </h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your team has used {usedPercentage}% of your available space. Need
            more?
          </p>
        </div>

        <div className="flex gap-2 w-full">
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="text-xs h-7 px-3 text-foreground hover:bg-accent"
            >
              Dismiss
            </Button>
          )}
          {onUpgrade && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onUpgrade}
              className="text-xs h-7 px-3 font-semibold text-foreground hover:bg-accent"
            >
              Upgrade plan
            </Button>
          )}
        </div>
      </div>
    </NotificationCard>
  );
}
