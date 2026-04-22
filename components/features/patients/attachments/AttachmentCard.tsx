"use client";

import { Modal, Tag, Button } from "antd";
import { Image, FileText, File, Download, Trash2 } from "lucide-react";
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
  if (mimeType.startsWith("image/")) return <Image className="h-5 w-5 text-blue-500" />;
  if (mimeType === "application/pdf") return <FileText className="h-5 w-5 text-red-500" />;
  return <File className="h-5 w-5 text-gray-400" />;
}

export function AttachmentCard({ attachment, patientId, onDelete, canDelete }: AttachmentCardProps) {
  const categoryLabel =
    ATTACHMENT_CATEGORIES.find((c) => c.value === attachment.category)?.label ?? attachment.category;
  const categoryColor = ATTACHMENT_CATEGORY_COLORS[attachment.category];

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
      Modal.error({ title: "Error", content: "No se pudo descargar el archivo." });
    }
  };

  const handleDelete = () => {
    Modal.confirm({
      title: "Eliminar archivo",
      content: `¿Estás seguro de que deseas eliminar "${attachment.fileName}"?`,
      okText: "Eliminar",
      okType: "danger",
      cancelText: "Cancelar",
      onOk: () => onDelete(attachment.id),
    });
  };

  return (
    <div className="flex items-center gap-2 rounded-md border bg-card p-2 text-sm">
      <FileIcon mimeType={attachment.mimeType} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium leading-tight" title={attachment.fileName}>
          {truncate(attachment.fileName, 24)}
        </p>
        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
          <Tag color={categoryColor} className="m-0 text-xs leading-tight">
            {categoryLabel}
          </Tag>
          <span className="text-xs text-muted-foreground">{formatDate(attachment.uploadedAt)}</span>
          <span className="text-xs text-muted-foreground">· {formatSize(attachment.sizeBytes)}</span>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button
          type="text"
          size="small"
          icon={<Download className="h-3.5 w-3.5" />}
          onClick={handleDownload}
          title="Descargar"
        />
        {canDelete && (
          <Button
            type="text"
            size="small"
            danger
            icon={<Trash2 className="h-3.5 w-3.5" />}
            onClick={handleDelete}
            title="Eliminar"
          />
        )}
      </div>
    </div>
  );
}
