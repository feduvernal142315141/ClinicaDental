"use client";

import { useState } from "react";
import { ImageIcon, FileText, File, Download, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/atomic/data-display/badge";
import { Button } from "@/components/ui/primitives/shadcn/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/primitives/shadcn/alert-dialog";
import { notify } from "@/lib/utils/notify";
import { cn } from "@/lib/utils/utils";
import apiInstance from "@/lib/services/apiConfig";
import { patientAttachmentsService } from "@/lib/services/patientAttachments/patientAttachments.service";
import {
  ATTACHMENT_CATEGORY_COLORS,
  ATTACHMENT_CATEGORIES,
  type PatientAttachment,
} from "@/lib/entity/patientAttachment";

interface AttachmentCardProps {
  attachment: PatientAttachment;
  patientId: string;
  onDelete: (id: string) => void;
  canDelete: boolean;
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + "…" : str;
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith("image/")) return <ImageIcon className="h-5 w-5 text-brand" />;
  if (mimeType === "application/pdf") return <FileText className="h-5 w-5 text-destructive" />;
  return <File className="h-5 w-5 text-subtle" />;
}

export function AttachmentCard({ attachment, patientId, onDelete, canDelete }: AttachmentCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const categoryLabel =
    ATTACHMENT_CATEGORIES.find((c) => c.value === attachment.category)?.label ?? attachment.category;
  const categoryClassName = ATTACHMENT_CATEGORY_COLORS[attachment.category];

  const handleDownload = async () => {
    try {
      const url = patientAttachmentsService.getDownloadUrl(patientId, attachment.id);
      const response = await apiInstance.get<Blob>(url, { responseType: "blob" });
      const blobUrl = URL.createObjectURL(response.data);
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = attachment.fileName;
      anchor.click();
      URL.revokeObjectURL(blobUrl);
    } catch {
      void notify.error("No se pudo descargar el archivo", {
        description: "Verifica tu conexión e inténtalo de nuevo; si el problema persiste, contacta a soporte.",
      });
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 rounded-md border border-hairline bg-surface p-2 text-sm">
        <FileIcon mimeType={attachment.mimeType} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium leading-tight" title={attachment.fileName}>
            {truncate(attachment.fileName, 24)}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-1">
            <Badge
              variant="outline"
              className={cn("text-xs leading-tight", categoryClassName)}
            >
              {categoryLabel}
            </Badge>
            <span className="text-xs text-subtle">{formatDate(attachment.uploadedAt)}</span>
            <span className="text-xs text-subtle">· {formatSize(attachment.sizeBytes)}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            type="button"
            className="h-7 w-7 text-subtle hover:text-ink"
            onClick={handleDownload}
            aria-label={`Descargar ${attachment.fileName}`}
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
          {canDelete && (
            <Button
              variant="ghost"
              size="icon"
              type="button"
              className="h-7 w-7 text-subtle hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setConfirmDelete(true)}
              aria-label={`Eliminar ${attachment.fileName}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent className="rounded-2xl border-hairline bg-surface shadow-bento">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-ink">Eliminar archivo</AlertDialogTitle>
            <AlertDialogDescription className="text-subtle">
              ¿Estás seguro de que deseas eliminar{" "}
              <span className="font-medium text-ink">&ldquo;{attachment.fileName}&rdquo;</span>?{" "}
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => onDelete(attachment.id)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
