"use client";

import { useState, MouseEvent } from "react";
import { Download, Eye, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { Badge } from "@/components/ui/atomic/data-display/badge";
import { cn } from "@/lib/utils/utils";
import {
  ATTACHMENT_CATEGORY_COLORS,
  type PatientAttachment,
} from "@/lib/entity/patientAttachment";
import {
  displayFileName,
  formatFileDate,
  formatFileSize,
  getAttachmentMediaType,
  getFileExtension,
  MEDIA_TYPE_STYLES,
  attachmentCategoryLabel,
} from "@/lib/utils/attachment-helpers";
import { useAttachmentBlob } from "./use-attachment-thumbnail";
import { MEDIA_TYPE_ICON } from "./media-type-icon";
import { AttachmentDeleteDialog } from "./AttachmentDeleteDialog";

interface AttachmentListRowProps {
  attachment: PatientAttachment;
  patientId: string;
  onView: (attachment: PatientAttachment) => void;
  onDownload: (attachment: PatientAttachment) => void;
  onDelete: (id: string) => void;
  canDelete: boolean;
  downloading: boolean;
}

export function AttachmentListRow({
  attachment,
  patientId,
  onView,
  onDownload,
  onDelete,
  canDelete,
  downloading,
}: AttachmentListRowProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const mediaType = getAttachmentMediaType(attachment.fileName, attachment.mimeType);
  const isImage = mediaType === "image";
  const ext = getFileExtension(attachment.fileName).toUpperCase() || "FILE";
  const MediaIcon = MEDIA_TYPE_ICON[mediaType];

  const { blobUrl } = useAttachmentBlob(patientId, attachment.id, isImage);

  const categoryLabel = attachmentCategoryLabel(attachment.category);
  const categoryClassName = ATTACHMENT_CATEGORY_COLORS[attachment.category];

  const handleRowClick = () => {
    onView(attachment);
  };

  const handleDownloadClick = (e: MouseEvent) => {
    e.stopPropagation();
    onDownload(attachment);
  };

  const handleDeleteClick = (e: MouseEvent) => {
    e.stopPropagation();
    setConfirmDelete(true);
  };

  return (
    <>
      <div
        onClick={handleRowClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleRowClick();
          }
        }}
        tabIndex={0}
        role="button"
        aria-label={`Ver archivo ${displayFileName(attachment.fileName)}`}
        className="group flex items-center justify-between gap-3 rounded-xl border border-hairline bg-surface p-2.5 transition-colors hover:border-brand/40 hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand cursor-pointer text-left"
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-elevated">
            {isImage && blobUrl ? (
              <img
                src={blobUrl}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <MediaIcon
                  className={cn("h-5 w-5", MEDIA_TYPE_STYLES[mediaType].iconColorClass)}
                  aria-hidden="true"
                />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                className="truncate text-xs font-semibold text-ink transition-colors group-hover:text-brand"
                title={attachment.fileName}
              >
                {displayFileName(attachment.fileName)}
              </span>
              <span className="shrink-0 rounded px-1 py-0.2 font-mono text-[9px] font-bold border text-subtle">
                {ext}
              </span>
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-subtle">
              <Badge
                variant="outline"
                className={cn("text-[9px] px-1 py-0 font-normal leading-none", categoryClassName)}
              >
                {categoryLabel}
              </Badge>
              <span>· {formatFileDate(attachment.uploadedAt)}</span>
              <span>· {formatFileSize(attachment.sizeBytes)}</span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            type="button"
            className="h-8 gap-1 px-2.5 text-xs text-subtle hover:text-ink"
            onClick={handleRowClick}
          >
            <Eye className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Ver</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            type="button"
            className="h-8 w-8 text-subtle hover:text-ink"
            onClick={handleDownloadClick}
            disabled={downloading}
            aria-label={`Descargar ${attachment.fileName}`}
          >
            {downloading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
          </Button>

          {canDelete && (
            <Button
              variant="ghost"
              size="icon"
              type="button"
              className="h-8 w-8 text-subtle hover:bg-destructive/10 hover:text-destructive"
              onClick={handleDeleteClick}
              aria-label={`Eliminar ${attachment.fileName}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      <AttachmentDeleteDialog
        attachment={attachment}
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        onConfirm={onDelete}
      />
    </>
  );
}
