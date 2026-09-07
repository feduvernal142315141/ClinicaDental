import {
  File as FileIcon,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Play,
  type LucideIcon,
} from "lucide-react";
import type { AttachmentMediaType } from "@/lib/utils/attachment-helpers";

export const MEDIA_TYPE_ICON: Record<AttachmentMediaType, LucideIcon> = {
  image: ImageIcon,
  video: Play,
  pdf: FileText,
  spreadsheet: FileSpreadsheet,
  document: FileText,
  other: FileIcon,
};
