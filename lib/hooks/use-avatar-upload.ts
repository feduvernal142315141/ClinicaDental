"use client";

import { useState } from "react";

import type { UploadFile, UploadProps, GetProp } from "antd";
import { notify } from "@/lib/utils/notify";

type FileType = Parameters<GetProp<UploadProps, "beforeUpload">>[0];

/**
 * Avatar Upload Hook
 *
 * Manages avatar upload state and validation logic.
 * Supports single or multiple file uploads with preview.
 *
 * @param initialFileList - Initial file list (for editing)
 * @param maxSizeMB - Maximum file size in MB (default: 2)
 * @param allowedFormats - Allowed image formats (default: ['image/jpeg', 'image/png', 'image/jpg'])
 * @param maxCount - Maximum number of files (default: 1 for avatar)
 * @param onFileListChange - Callback when file list changes
 *
 * @returns {object} - Hook state and handlers
 */
interface UseAvatarUploadOptions {
  initialFileList?: UploadFile[];
  maxSizeMB?: number;
  allowedFormats?: string[];
  maxCount?: number;
  onFileListChange?: (fileList: UploadFile[]) => void;
}

export function useAvatarUpload({
  initialFileList = [],
  maxSizeMB = 2,
  allowedFormats = ["image/jpeg", "image/png", "image/jpg"],
  onFileListChange,
}: UseAvatarUploadOptions = {}) {
  const [fileList, setFileList] = useState<UploadFile[]>(initialFileList);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState("");

  /**
   * Convert file to base64 for preview
   */
  const getBase64 = (file: FileType): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });

  /**
   * Validate file before upload
   */
  const beforeUpload = (file: FileType): boolean => {
    // Check file type
    const isValidFormat = allowedFormats.includes(file.type);
    if (!isValidFormat) {
      notify.error(
        `Solo se permiten archivos: ${allowedFormats
          .map((f) => f.split("/")[1].toUpperCase())
          .join(", ")}`,
        {
          description:
            "El archivo que elegiste no tiene un formato de imagen válido. Selecciona una foto en alguno de los formatos permitidos.",
        },
      );
      return false;
    }

    // Check file size
    const isValidSize = file.size / 1024 / 1024 < maxSizeMB;
    if (!isValidSize) {
      notify.error(`La imagen debe ser menor a ${maxSizeMB}MB`, {
        description:
          "La foto seleccionada supera el tamaño máximo permitido. Comprímela o elige una imagen más ligera e inténtalo de nuevo.",
      });
      return false;
    }

    return false; // Prevent auto upload, handle manually
  };

  /**
   * Handle file list change
   */
  const handleChange: UploadProps["onChange"] = ({ fileList: newFileList }) => {
    setFileList(newFileList);

    // Notify parent component
    if (onFileListChange) {
      onFileListChange(newFileList);
    }

    // Auto-generate preview for new files
    newFileList.forEach(async (file) => {
      if (file.originFileObj && !file.url && !file.preview) {
        try {
          file.preview = await getBase64(file.originFileObj as FileType);
        } catch (error) {
          console.error("Error generating preview:", error);
        }
      }
    });
  };

  /**
   * Handle preview modal
   */
  const handlePreview = async (file: UploadFile) => {
    if (!file.url && !file.preview) {
      file.preview = await getBase64(file.originFileObj as FileType);
    }

    setPreviewImage(file.url || (file.preview as string));
    setPreviewOpen(true);
  };

  /**
   * Close preview modal
   */
  const handlePreviewClose = () => {
    setPreviewOpen(false);
  };

  /**
   * Clear preview image when modal closes
   */
  const handlePreviewOpenChange = (visible: boolean) => {
    setPreviewOpen(visible);
    if (!visible) {
      setPreviewImage("");
    }
  };

  return {
    fileList,
    previewOpen,
    previewImage,
    beforeUpload,
    handleChange,
    handlePreview,
    handlePreviewClose,
    handlePreviewOpenChange,
    setFileList,
  };
}
