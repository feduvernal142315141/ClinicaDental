"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ATTACHMENT_CATEGORIES,
  type AttachmentCategory,
  type PatientAttachment,
} from "@/lib/entity/patientAttachment";
import {
  displayFileName,
  getAttachmentMediaType,
  type AttachmentMediaType,
} from "@/lib/utils/attachment-helpers";
import { matchesQuery } from "@/lib/utils/text";

export type CategoryFilter = "all" | AttachmentCategory;
export type MediaFilter = "all" | AttachmentMediaType;

const CATEGORY_LABEL = new Map(
  ATTACHMENT_CATEGORIES.map((category) => [category.value, category.label]),
);

export function useAttachmentFilters(attachments: PatientAttachment[]) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [mediaType, setMediaType] = useState<MediaFilter>("all");

  const filtered = useMemo(() => {
    const trimmed = query.trim();

    return attachments.filter((attachment) => {
      if (category !== "all" && attachment.category !== category) return false;

      if (
        mediaType !== "all" &&
        getAttachmentMediaType(attachment.fileName, attachment.mimeType) !== mediaType
      ) {
        return false;
      }

      if (!trimmed) return true;

      const haystack = [
        displayFileName(attachment.fileName),
        attachment.notes ?? "",
        CATEGORY_LABEL.get(attachment.category) ?? attachment.category,
      ].join(" ");

      return matchesQuery(haystack, trimmed);
    });
  }, [attachments, query, category, mediaType]);

  const hasActiveFilters =
    query.trim() !== "" || category !== "all" || mediaType !== "all";

  const clear = useCallback(() => {
    setQuery("");
    setCategory("all");
    setMediaType("all");
  }, []);

  return {
    query,
    setQuery,
    category,
    setCategory,
    mediaType,
    setMediaType,
    filtered,
    hasActiveFilters,
    clear,
  };
}
