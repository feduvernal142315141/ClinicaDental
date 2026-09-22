import { toLocalDate } from "@/lib/datetime";
import {
  ATTACHMENT_CATEGORIES,
  type AttachmentCategory,
} from "@/lib/entity/patientAttachment";

const CATEGORY_LABEL = new Map(
  ATTACHMENT_CATEGORIES.map((category) => [category.value, category.label]),
);

export function attachmentCategoryLabel(category: AttachmentCategory | string): string {
  return CATEGORY_LABEL.get(category as AttachmentCategory) ?? category;
}

export const MAX_ATTACHMENT_SIZE_MB = 50;
export const MAX_ATTACHMENT_SIZE_BYTES = MAX_ATTACHMENT_SIZE_MB * 1024 * 1024;

export type AttachmentMediaType =
  | "image"
  | "video"
  | "pdf"
  | "spreadsheet"
  | "document"
  | "other";

const UUID_PREFIX_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[_-]?/i;

export function getFileExtension(fileName?: string): string {
  if (!fileName) return "";
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex === -1 || dotIndex === fileName.length - 1) return "";
  return fileName.slice(dotIndex + 1).toLowerCase();
}

export function displayFileName(
  rawFileName?: string,
  categoryLabel?: string,
): string {
  const raw = (rawFileName ?? "").trim();
  const stripped = raw.replace(UUID_PREFIX_REGEX, "").trim();
  if (stripped) return stripped;
  return categoryLabel ?? "Archivo";
}

export function getAttachmentMediaType(
  fileName?: string,
  mimeType?: string,
): AttachmentMediaType {
  const mime = (mimeType ?? "").toLowerCase();
  const ext = getFileExtension(fileName);

  if (mime.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "gif", "svg", "bmp", "ico", "tiff"].includes(ext)) {
    return "image";
  }

  if (mime.startsWith("video/") || ["mp4", "webm", "mov", "avi", "mkv", "ogv"].includes(ext)) {
    return "video";
  }

  if (mime === "application/pdf" || ext === "pdf") {
    return "pdf";
  }

  if (
    mime.includes("spreadsheet") ||
    mime.includes("excel") ||
    mime.includes("csv") ||
    ["xlsx", "xls", "csv", "ods"].includes(ext)
  ) {
    return "spreadsheet";
  }

  if (
    mime.includes("word") ||
    mime.includes("document") ||
    mime.includes("text/plain") ||
    mime.includes("rtf") ||
    ["doc", "docx", "txt", "rtf", "odt"].includes(ext)
  ) {
    return "document";
  }

  return "other";
}

export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatFileDate(iso?: string): string {
  const local = toLocalDate(iso);
  if (!local) return "";
  const [year, month, day] = local.split("-");
  return `${day}/${month}/${year}`;
}

export interface MediaTypeStyle {
  label: string;
  badgeClass: string;
  cardBannerClass: string;
  iconColorClass: string;
  iconWrapperClass: string;
}

export const MEDIA_TYPE_STYLES: Record<AttachmentMediaType, MediaTypeStyle> = {
  image: {
    label: "Imagen",
    badgeClass: "bg-brand/10 text-brand border-brand/25",
    cardBannerClass: "from-brand/15 to-transparent",
    iconColorClass: "text-brand",
    iconWrapperClass: "bg-brand/20 text-brand rounded-2xl",
  },
  video: {
    label: "Video",
    badgeClass: "bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/25",
    cardBannerClass: "from-violet-500/15 to-transparent",
    iconColorClass: "text-violet-600 dark:text-violet-400",
    iconWrapperClass: "bg-violet-500/20 text-violet-600 dark:text-violet-400 rounded-full",
  },
  pdf: {
    label: "PDF",
    badgeClass: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25",
    cardBannerClass: "from-rose-500/15 to-transparent",
    iconColorClass: "text-rose-600 dark:text-rose-400",
    iconWrapperClass: "bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-2xl",
  },
  spreadsheet: {
    label: "Excel / CSV",
    badgeClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25",
    cardBannerClass: "from-emerald-500/15 to-transparent",
    iconColorClass: "text-emerald-600 dark:text-emerald-400",
    iconWrapperClass: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl",
  },
  document: {
    label: "Documento",
    badgeClass: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/25",
    cardBannerClass: "from-sky-500/15 to-transparent",
    iconColorClass: "text-sky-600 dark:text-sky-400",
    iconWrapperClass: "bg-sky-500/20 text-sky-600 dark:text-sky-400 rounded-2xl",
  },
  other: {
    label: "Archivo",
    badgeClass: "bg-surface text-subtle border-hairline",
    cardBannerClass: "from-subtle/10 to-transparent",
    iconColorClass: "text-subtle",
    iconWrapperClass: "bg-surface text-subtle rounded-2xl",
  },
};
