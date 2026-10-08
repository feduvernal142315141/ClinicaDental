"use client";

import { useRouter } from "next/navigation";
import {
  Button,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui";
import {
  MoreHorizontal,
  Pencil,
  Send,
  Clock,
  Pause,
  Play,
  XCircle,
} from "lucide-react";
import { useI18n } from "@/lib/contexts/i18n-context";
import type { GrowthCampaignStatus } from "@/lib/entity/growth";
import { useGrowthCampaignActions } from "@/lib/hooks/growth";

interface GrowthCampaignActionsProps {
  campaignId: string;
  status: GrowthCampaignStatus;
  onActionComplete?: () => void;
}

const TERMINAL_STATUSES: GrowthCampaignStatus[] = [
  "COMPLETED",
  "CANCELLED",
  "FAILED",
];

export function GrowthCampaignActions({
  campaignId,
  status,
  onActionComplete,
}: GrowthCampaignActionsProps) {
  const router = useRouter();
  const { t } = useI18n();
  const { acting, sendNow, schedule, pause, resume, cancel } =
    useGrowthCampaignActions(onActionComplete);

  const isTerminal = TERMINAL_STATUSES.includes(status);

  if (isTerminal) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" disabled={acting}>
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">{t("growth.actions.actions")}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {status === "DRAFT" && (
            <>
              <DropdownMenuItem
                onClick={() => router.push(`/growth/campaigns/${campaignId}/edit`)}
              >
                <Pencil className="mr-2 h-4 w-4" />
                {t("growth.actions.edit")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => schedule(campaignId)}>
                <Clock className="mr-2 h-4 w-4" />
                {t("growth.actions.schedule")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => sendNow(campaignId)}>
                <Send className="mr-2 h-4 w-4" />
                {t("growth.actions.sendNow")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          {status === "RUNNING" && (
            <DropdownMenuItem onClick={() => pause(campaignId)}>
              <Pause className="mr-2 h-4 w-4" />
              {t("growth.actions.pause")}
            </DropdownMenuItem>
          )}
          {status === "PAUSED" && (
            <DropdownMenuItem onClick={() => resume(campaignId)}>
              <Play className="mr-2 h-4 w-4" />
              {t("growth.actions.resume")}
            </DropdownMenuItem>
          )}
          {!isTerminal && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <XCircle className="mr-2 h-4 w-4" />
                  {t("growth.actions.cancelCampaign")}
                </DropdownMenuItem>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("growth.campaigns.cancelTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("growth.campaigns.cancelDescription")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("growth.campaigns.keepCampaign")}</AlertDialogCancel>
                  <AlertDialogAction onClick={() => cancel(campaignId)}>
                    {t("growth.campaigns.confirmCancel")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

    </>
  );
}
