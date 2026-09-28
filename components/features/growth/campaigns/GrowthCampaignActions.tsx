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
            <span className="sr-only">Acciones</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {status === "DRAFT" && (
            <>
              <DropdownMenuItem
                onClick={() => router.push(`/growth/campaigns/${campaignId}/edit`)}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => schedule(campaignId)}>
                <Clock className="mr-2 h-4 w-4" />
                Programar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => sendNow(campaignId)}>
                <Send className="mr-2 h-4 w-4" />
                Enviar ahora
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          {status === "RUNNING" && (
            <DropdownMenuItem onClick={() => pause(campaignId)}>
              <Pause className="mr-2 h-4 w-4" />
              Pausar
            </DropdownMenuItem>
          )}
          {status === "PAUSED" && (
            <DropdownMenuItem onClick={() => resume(campaignId)}>
              <Play className="mr-2 h-4 w-4" />
              Reanudar
            </DropdownMenuItem>
          )}
          {!isTerminal && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancelar campaña
                </DropdownMenuItem>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Cancelar esta campaña?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción no se puede deshacer. La campaña dejará de
                    enviarse a los destinatarios restantes.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>No, mantener</AlertDialogCancel>
                  <AlertDialogAction onClick={() => cancel(campaignId)}>
                    Sí, cancelar
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
