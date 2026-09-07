"use client";

import { useState, MouseEvent } from "react";
import { Download, Eye, Image as ImageIcon, Loader2, Trash2 } from "lucide-react";
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

interface AttachmentGridCardProps {
  attachment: PatientAttachment;
  patientId: string;
  onView: (attachment: PatientAttachment) => void;
  onDownload: (attachment: PatientAttachment) => void;
  onDelete: (id: string) => void;
  canDelete: boolean;
  downloading: boolean;
}

export function AttachmentGridCard({
  attachment,
  patientId,
  onView,
  onDownload,
  onDelete,
  canDelete,
  downloading,
}: AttachmentGridCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const mediaType = getAttachmentMediaType(attachment.fileName, attachment.mimeType);
  const isImage = mediaType === "image";
  const ext = getFileExtension(attachment.fileName).toUpperCase() || "FILE";
  const mediaStyle = MEDIA_TYPE_STYLES[mediaType];
  const MediaIcon = MEDIA_TYPE_ICON[mediaType];

  const { blobUrl, loading: loadingBlob } = useAttachmentBlob(
    patientId,
    attachment.id,
    isImage,
  );

  const categoryLabel = attachmentCategoryLabel(attachment.category);
  const categoryClassName = ATTACHMENT_CATEGORY_COLORS[attachment.category];

  const handleCardClick = () => {
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
      <article
        onClick={handleCardClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleCardClick();
          }
        }}
        tabIndex={0}
        role="button"
        aria-label={`Ver archivo ${displayFileName(attachment.fileName)}`}
        className="group relative flex flex-col overflow-hidden rounded-2xl border border-hairline bg-surface shadow-bento transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand cursor-pointer select-none text-left"
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-elevated/70">
          {isImage ? (
            loadingBlob ? (
              <div className="flex h-full w-full items-center justify-center bg-elevated">
                <Loader2 className="h-6 w-6 animate-spin text-subtle" />
              </div>
            ) : blobUrl ? (
              <img
                src={blobUrl}
                alt={displayFileName(attachment.fileName)}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-elevated">
                <ImageIcon className="h-8 w-8 text-subtle" />
              </div>
            )
          ) : (
            <div
              className={cn(
                "flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br p-3 transition-colors",
                mediaStyle.cardBannerClass,
              )}
            >
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center transition-transform group-hover:scale-110",
                  mediaStyle.iconWrapperClass,
                )}
              >
                <MediaIcon
                  className={cn("h-6 w-6", mediaType === "video" && "fill-current pl-0.5")}
                  aria-hidden="true"
                />
              </div>
            </div>
          )}

          <div className="absolute left-2 top-2 z-10 flex items-center gap-1">
            <span
              className={cn(
                "rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wider shadow-sm backdrop-blur-sm border",
                mediaStyle.badgeClass,
              )}
            >
              {ext}
            </span>
          </div>

          <div className="absolute inset-0 z-10 flex items-center justify-center gap-1.5 bg-black/50 opacity-0 backdrop-blur-[2px] transition-opacity duration-200 group-hover:opacity-100">
            <Button
              variant="default"
              size="sm"
              type="button"
              className="h-8 gap-1.5 rounded-lg bg-white/90 px-3 text-xs font-medium text-black hover:bg-white shadow-md"
              onClick={(e) => {
                e.stopPropagation();
                onView(attachment);
              }}
            >
              <Eye className="h-3.5 w-3.5" />
              Ver
            </Button>
            <Button
              variant="ghost"
              size="icon"
              type="button"
              className="h-8 w-8 rounded-lg bg-black/60 text-white hover:bg-black/90 hover:text-white"
              onClick={handleDownloadClick}
              disabled={downloading}
              title="Descargar archivo"
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
                className="h-8 w-8 rounded-lg bg-black/60 text-white hover:bg-destructive hover:text-white"
                onClick={handleDeleteClick}
                title="Eliminar archivo"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-between p-3">
          <div className="min-w-0">
            <h4
              className="truncate text-xs font-semibold text-ink transition-colors group-hover:text-brand"
              title={attachment.fileName}
            >
              {displayFileName(attachment.fileName)}
            </h4>
            <div className="mt-1 flex items-center gap-1.5">
              <Badge
                variant="outline"
                className={cn("text-[10px] px-1 py-0 font-normal leading-tight", categoryClassName)}
              >
                {categoryLabel}
              </Badge>
            </div>
          </div>

          <div className="mt-2.5 flex items-center justify-between border-t border-hairline/60 pt-2 text-[11px] text-subtle">
            <span>{formatFileDate(attachment.uploadedAt)}</span>
            <span>{formatFileSize(attachment.sizeBytes)}</span>
          </div>
        </div>
      </article>

      <AttachmentDeleteDialog
        attachment={attachment}
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        onConfirm={onDelete}
      />
    </>
  );
}
