"use client";

import { useRef, useState, type DragEvent } from "react";
import {
  Loader2,
  Paperclip,
  FileX2,
  Plus,
  AlertTriangle,
  LayoutGrid,
  List,
  X,
  UploadCloud,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { SearchInput } from "@/components/ui/atomic/forms/search-input";
import { usePatientAttachments } from "@/lib/hooks/patientAttachments/usePatientAttachments";
import {
  ATTACHMENT_CATEGORIES,
  type AttachmentCategory,
  type PatientAttachment,
} from "@/lib/entity/patientAttachment";
import { useI18n } from "@/lib/contexts/i18n-context";
import type { TranslationKey } from "@/lib/i18n/translations";
import { notify } from "@/lib/utils/notify";
import { notifyApiError } from "@/lib/utils/notify-error";
import { patientAttachmentsService } from "@/lib/services/patientAttachments/patientAttachments.service";
import {
  formatFileSize,
  getAttachmentMediaType,
  MAX_ATTACHMENT_SIZE_BYTES,
  MAX_ATTACHMENT_SIZE_MB,
} from "@/lib/utils/attachment-helpers";
import { useAttachmentFilters, type CategoryFilter } from "./use-attachment-filters";
import { AttachmentGridCard } from "./AttachmentGridCard";
import { AttachmentListRow } from "./AttachmentListRow";
import { AttachmentViewerModal } from "./AttachmentViewerModal";
import { AttachmentUploadModal } from "./AttachmentUploadModal";
import { cn } from "@/lib/utils/utils";

interface PatientAttachmentsSectionProps {
  patientId: string;
  canUpload: boolean;
  canDelete: boolean;
  activeAppointmentId?: string;
}

function inferCategory(file: File, activeCategory: CategoryFilter): AttachmentCategory {
  if (activeCategory !== "all") return activeCategory;
  const name = file.name.toLowerCase();
  const type = getAttachmentMediaType(file.name, file.type);

  if (
    name.includes("rx") ||
    name.includes("radio") ||
    name.includes("panoram") ||
    name.includes("periapical") ||
    name.includes("bite") ||
    name.includes("tac") ||
    name.includes("telerad") ||
    name.includes("cefalom")
  ) {
    return "radiografia";
  }

  if (
    name.includes("consent") ||
    name.includes("firma") ||
    name.includes("autoriz") ||
    name.includes("desistim")
  ) {
    return "consentimiento";
  }

  if (type === "image") {
    return "imagen_clinica";
  }

  return "otro";
}

function categoryLabelKey(category: AttachmentCategory): TranslationKey {
  return `attachments.category.${category}` as TranslationKey;
}

export function PatientAttachmentsSection({
  patientId,
  canUpload,
  canDelete,
  activeAppointmentId,
}: PatientAttachmentsSectionProps) {
  const { t } = useI18n();
  const text = (
    key: TranslationKey,
    params?: Record<string, string | number>,
  ) => {
    let value = t(key);
    if (!params) return value;
    for (const [name, replacement] of Object.entries(params)) {
      value = value.replaceAll(`{${name}}`, String(replacement));
    }
    return value;
  };
  const categoryLabel = (category: AttachmentCategory) => t(categoryLabelKey(category));

  const [modalOpen, setModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewingAttachmentId, setViewingAttachmentId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const [isDraggingOverArea, setIsDraggingOverArea] = useState(false);
  const dragCounterRef = useRef(0);

  const {
    attachments,
    loading,
    uploading,
    error,
    forbidden,
    load,
    upload,
    uploadMany,
    remove,
  } = usePatientAttachments(patientId);

  const {
    query: searchQuery,
    setQuery: setSearchQuery,
    category: selectedCategory,
    setCategory: setSelectedCategory,
    mediaType: selectedMediaType,
    setMediaType: setSelectedMediaType,
    filtered: filteredAttachments,
    hasActiveFilters,
    clear: clearFilters,
  } = useAttachmentFilters(attachments);

  const handleUpload = async (
    file: File,
    category: AttachmentCategory,
    notes?: string,
    appointmentId?: string,
  ) => {
    try {
      await upload(file, category, notes, appointmentId ?? activeAppointmentId);
      void notify.success(t("attachments.gallery.fileUploaded"), {
        description: t("attachments.gallery.fileUploadedDescription"),
      });
    } catch (err) {
      notifyApiError(t("attachments.gallery.uploadFailed"), err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await remove(id);
      void notify.success(t("attachments.gallery.fileDeleted"), {
        description: t("attachments.gallery.fileDeletedDescription"),
      });
    } catch (err) {
      notifyApiError(t("attachments.gallery.deleteFailed"), err);
    }
  };

  const handleDownload = async (attachment: PatientAttachment) => {
    setDownloadingId(attachment.id);
    try {
      const blob = await patientAttachmentsService.downloadAttachment(
        patientId,
        attachment.id,
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = attachment.fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      notifyApiError(t("attachments.gallery.downloadFailed"), err);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleView = (attachment: PatientAttachment) => {
    setViewingAttachmentId(attachment.id);
    setViewerOpen(true);
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!canUpload || uploading) return;
    dragCounterRef.current += 1;
    if (e.dataTransfer.types.includes("Files")) {
      setIsDraggingOverArea(true);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canUpload || uploading) return;
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      setIsDraggingOverArea(false);
      dragCounterRef.current = 0;
    }
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDraggingOverArea(false);

    if (!canUpload || uploading) return;

    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length === 0) return;

    for (const file of dropped.filter((f) => f.size > MAX_ATTACHMENT_SIZE_BYTES)) {
      void notify.error(
        text("attachments.gallery.tooLarge", {
          name: file.name,
          max: MAX_ATTACHMENT_SIZE_MB,
        }),
      );
    }

    const items = dropped
      .filter((file) => file.size <= MAX_ATTACHMENT_SIZE_BYTES)
      .map((file) => ({
        file,
        category: inferCategory(file, selectedCategory),
        appointmentId: activeAppointmentId,
      }));
    if (items.length === 0) return;

    const outcomes = await uploadMany(items);

    for (const outcome of outcomes) {
      if (!outcome.ok) {
        notifyApiError(
          `${t("attachments.gallery.uploadFailed")}: "${outcome.file.name}"`,
          outcome.error,
        );
      }
    }

    const uploaded = outcomes.filter((outcome) => outcome.ok);
    if (uploaded.length === 0) return;

    const assigned = [
      ...new Set(uploaded.map((outcome) => categoryLabel(outcome.category))),
    ];
    void notify.success(
      uploaded.length === 1
        ? t("attachments.gallery.fileAdded")
        : text("attachments.gallery.filesAdded", { count: uploaded.length }),
      {
        description:
          selectedCategory === "all"
            ? text("attachments.gallery.categoryInferred", {
                categories: assigned.join(", "),
              })
            : text("attachments.gallery.archivedIn", {
                categories: assigned.join(", "),
              }),
      },
    );
  };

  const totalBytes = attachments.reduce((acc, a) => acc + (a.sizeBytes || 0), 0);


  const showingStaleList = Boolean(error) && attachments.length > 0;

  const gallery = filteredAttachments.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-hairline bg-surface py-12 text-center shadow-bento">
          <p className="text-sm font-medium text-ink">{t("attachments.gallery.noMatchesTitle")}</p>
          <p className="text-xs text-subtle">{t("attachments.gallery.noMatchesDescription")}</p>
          <Button
            variant="outline"
            size="sm"
            type="button"
            className="mt-2 text-xs"
            onClick={clearFilters}
          >
            {t("attachments.gallery.showAll")}
          </Button>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3.5 w-full">
          {filteredAttachments.map((attachment) => (
            <AttachmentGridCard
              key={attachment.id}
              attachment={attachment}
              patientId={patientId}
              onView={handleView}
              onDownload={handleDownload}
              onDelete={handleDelete}
              canDelete={canDelete}
              downloading={downloadingId === attachment.id}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2 w-full">
          {filteredAttachments.map((attachment) => (
            <AttachmentListRow
              key={attachment.id}
              attachment={attachment}
              patientId={patientId}
              onView={handleView}
              onDownload={handleDownload}
              onDelete={handleDelete}
              canDelete={canDelete}
              downloading={downloadingId === attachment.id}
            />
          ))}
        </div>
  );

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "relative w-full min-h-[480px] space-y-4 rounded-2xl transition-all",
        isDraggingOverArea && "ring-2 ring-brand ring-offset-4 ring-offset-background",
      )}
    >
      {isDraggingOverArea && (
        <div className="pointer-events-none absolute inset-0 z-50 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-brand bg-surface/95 p-8 shadow-2xl backdrop-blur-sm animate-in fade-in duration-150">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/15 text-brand shadow-inner animate-bounce">
            <UploadCloud className="h-8 w-8" />
          </div>
          <h3 className="mt-4 text-base font-bold text-ink">
            {t("attachments.gallery.dropTitle")}
          </h3>
          <p className="mt-1 max-w-sm text-center text-xs text-subtle">
            {selectedCategory !== "all"
              ? text("attachments.gallery.dropFiltered", {
                  category: categoryLabel(selectedCategory),
                })
              : t("attachments.gallery.dropAuto")}
          </p>
        </div>
      )}

      {uploading && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl border border-hairline bg-surface/95 px-4 py-2.5 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-3">
          <Loader2 className="h-4 w-4 animate-spin text-brand" />
          <span className="text-xs font-medium text-ink">{t("attachments.gallery.saving")}</span>
        </div>
      )}

      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-hairline bg-surface p-4 shadow-bento">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
            <Paperclip className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-ink">{t("attachments.gallery.title")}</h3>
              {attachments.length > 0 && (
                <span className="rounded-full bg-elevated px-2 py-0.5 text-xs font-semibold text-ink border border-hairline">
                  {attachments.length}
                </span>
              )}
            </div>
            <p className="text-xs text-subtle">
              {attachments.length > 0
                ? `${attachments.length} ${t(attachments.length > 1 ? "attachments.gallery.filePlural" : "attachments.gallery.fileSingular")} · ${formatFileSize(totalBytes)} ${t("attachments.gallery.total")} · ${t("attachments.gallery.dragUpload")}`
                : `${t("attachments.gallery.digitalRecord")} · ${t("attachments.gallery.dragUpload")}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center rounded-xl border border-hairline bg-elevated/80 p-0.5">
            <Button
              variant="ghost"
              size="icon"
              type="button"
              className={cn(
                "h-7 w-7 rounded-lg text-subtle transition-all",
                viewMode === "grid" && "bg-surface text-ink shadow-sm",
              )}
              onClick={() => setViewMode("grid")}
              title={t("attachments.gallery.gridView")}
              aria-label={t("attachments.gallery.gridView")}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              type="button"
              className={cn(
                "h-7 w-7 rounded-lg text-subtle transition-all",
                viewMode === "list" && "bg-surface text-ink shadow-sm",
              )}
              onClick={() => setViewMode("list")}
              title={t("attachments.gallery.listView")}
              aria-label={t("attachments.gallery.listView")}
            >
              <List className="h-3.5 w-3.5" />
            </Button>
          </div>

          {canUpload && (
            <Button
              variant="default"
              size="sm"
              type="button"
              className="h-8 gap-1.5 bg-brand px-3 text-xs font-medium text-white shadow-sm hover:bg-brand/90"
              onClick={() => setModalOpen(true)}
            >
              <Plus className="h-4 w-4" />
              {t("attachments.gallery.upload")}
            </Button>
          )}
        </div>
      </header>

      {attachments.length > 0 && (
        <div className="flex flex-col gap-2.5 rounded-2xl border border-hairline bg-surface p-3 shadow-bento">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-full sm:max-w-xs">
              <SearchInput
                placeholder={t("attachments.gallery.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 text-xs bg-elevated/60"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-medium text-subtle mr-1 hidden lg:inline">
                {t("attachments.gallery.type")}
              </span>
              {(
                [
                  { value: "all", label: t("attachments.gallery.type.all") },
                  { value: "image", label: t("attachments.gallery.type.image") },
                  { value: "video", label: t("attachments.gallery.type.video") },
                  { value: "pdf", label: t("attachments.gallery.type.pdf") },
                  { value: "spreadsheet", label: t("attachments.gallery.type.spreadsheet") },
                  { value: "document", label: t("attachments.gallery.type.document") },
                ] as const
              ).map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setSelectedMediaType(type.value)}
                  className={cn(
                    "rounded-lg px-2 py-1 text-xs font-medium transition-colors",
                    selectedMediaType === type.value
                      ? "bg-brand text-white shadow-sm"
                      : "bg-elevated/70 text-subtle hover:bg-hover hover:text-ink",
                  )}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-hairline/60 pt-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-medium text-subtle mr-1">{t("attachments.gallery.category")}</span>
              <button
                type="button"
                onClick={() => setSelectedCategory("all")}
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors border",
                  selectedCategory === "all"
                    ? "border-brand/40 bg-brand/10 text-brand font-semibold"
                    : "border-transparent bg-elevated text-subtle hover:bg-hover hover:text-ink",
                )}
              >
                {t("attachments.gallery.category.all")}
              </button>
              {ATTACHMENT_CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setSelectedCategory(cat.value)}
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors border",
                    selectedCategory === cat.value
                      ? "border-brand/40 bg-brand/10 text-brand font-semibold"
                      : "border-transparent bg-elevated text-subtle hover:bg-hover hover:text-ink",
                  )}
                >
                  {categoryLabel(cat.value)}
                </button>
              ))}
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                type="button"
                className="h-6 gap-1 px-2 text-[11px] text-subtle hover:text-ink"
                onClick={clearFilters}
              >
                <X className="h-3 w-3" />
                {t("attachments.gallery.clearFilters")}
              </Button>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-subtle">
          <Loader2 className="h-6 w-6 animate-spin text-brand" />
          <p className="text-xs">{t("attachments.gallery.loading")}</p>
        </div>
      ) : error ? (
        <div className="space-y-3">
          <Alert live={false}>
            <AlertTriangle />
            <AlertTitle>
              {forbidden
                ? t("attachments.gallery.noAccessTitle")
                : showingStaleList
                  ? t("attachments.gallery.updateFailedTitle")
                  : t("attachments.gallery.loadFailedTitle")}
            </AlertTitle>
            <AlertDescription className="flex flex-col items-start gap-2">
              <span>
                {forbidden
                  ? t("attachments.gallery.noAccessDescription")
                  : showingStaleList
                    ? t("attachments.gallery.updateFailedDescription")
                    : t("attachments.gallery.loadFailedDescription")}
              </span>
              {!forbidden && (
                <Button variant="outline" size="sm" type="button" onClick={() => void load()}>
                  {t("clinical.visit.retry")}
                </Button>
              )}
            </AlertDescription>
          </Alert>
          {showingStaleList && gallery}
        </div>
      ) : attachments.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-hairline bg-surface/50 py-16 text-center shadow-bento">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <FileX2 className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-ink">{t("attachments.gallery.emptyTitle")}</h4>
            <p className="max-w-xs text-xs text-subtle">
              {t("attachments.gallery.emptyDescription")}
            </p>
          </div>
          {canUpload && (
            <Button
              variant="default"
              size="sm"
              type="button"
              className="mt-1 gap-1.5 bg-brand px-4 text-xs text-white hover:bg-brand/90 shadow-sm"
              onClick={() => setModalOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              {t("attachments.gallery.uploadFirst")}
            </Button>
          )}
        </div>
      ) : (
        gallery
      )}

      <AttachmentUploadModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onUpload={handleUpload}
        uploading={uploading}
        appointmentId={activeAppointmentId}
      />

      <AttachmentViewerModal
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        attachments={filteredAttachments}
        initialAttachmentId={viewingAttachmentId}
        patientId={patientId}
      />
    </div>
  );
}
