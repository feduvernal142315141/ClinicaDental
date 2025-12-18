"use client";

import { Upload, Image } from "antd";
import { LoadingOutlined, PlusOutlined } from "@ant-design/icons";
import { useAvatarUpload } from "@/hooks/use-avatar-upload";
import type { UploadFile } from "antd";

interface AvatarUploadProps {
  /** Initial file list (for editing) */
  initialFileList?: UploadFile[];
  /** Upload endpoint URL (optional, if not provided will only preview locally) */
  action?: string;
  /** Maximum file size in MB */
  maxSizeMB?: number;
  /** Allowed image formats */
  allowedFormats?: string[];
  /** Maximum number of files */
  maxCount?: number;
  /** Callback when file list changes */
  onFileListChange?: (fileList: UploadFile[]) => void;
  /** List type: picture-card or picture-circle */
  listType?: "picture-card" | "picture-circle";
  /** Custom width for upload area */
  width?: string | number;
  /** Custom height for upload area */
  height?: string | number;
}

/**
 * Avatar Upload Component
 *
 * Image uploader with preview support for doctor avatars.
 * Supports single or multiple images with validation.
 * Validates file type and size before upload.
 *
 * @example
 * // Single avatar (circle)
 * <AvatarUpload
 *   maxCount={1}
 *   listType="picture-circle"
 *   onFileListChange={(files) => {
 *     const url = files[0]?.preview || files[0]?.url;
 *     form.setFieldValue('avatarUrl', url);
 *   }}
 * />
 *
 * @example
 * // Multiple images (card)
 * <AvatarUpload
 *   maxCount={5}
 *   listType="picture-card"
 *   initialFileList={doctor.images}
 *   onFileListChange={(files) => form.setFieldValue('images', files)}
 * />
 *
 * @example
 * // With server upload
 * <AvatarUpload
 *   action="/api/upload"
 *   maxCount={1}
 *   onFileListChange={(files) => console.log(files)}
 * />
 */
export function AvatarUpload({
  initialFileList,
  action,
  maxSizeMB = 2,
  allowedFormats,
  maxCount = 1,
  onFileListChange,
  listType = "picture-circle",
  width = "10rem",
  height = "10rem",
}: AvatarUploadProps) {
  const {
    fileList,
    previewOpen,
    previewImage,
    beforeUpload,
    handleChange,
    handlePreview,
    handlePreviewOpenChange,
  } = useAvatarUpload({
    initialFileList,
    maxSizeMB,
    allowedFormats,
    maxCount,
    onFileListChange,
  });

  // Upload button
  const uploadButton = (
    <button style={{ border: 0, background: "none" }} type="button">
      <PlusOutlined />
      <div style={{ marginTop: 8 }}>Subir foto</div>
    </button>
  );

  return (
    <>
      <Upload
        action={action}
        listType={listType}
        fileList={fileList}
        beforeUpload={beforeUpload}
        onPreview={handlePreview}
        onChange={handleChange}
        maxCount={maxCount}
        accept={allowedFormats?.join(",") || "image/jpeg,image/png,image/jpg"}
        style={{ width, height }}
      >
        {fileList.length >= maxCount ? null : uploadButton}
      </Upload>

      {/* Preview Modal */}
      {previewImage && (
        <Image
          wrapperStyle={{ display: "none" }}
          preview={{
            visible: previewOpen,
            onVisibleChange: handlePreviewOpenChange,
            afterOpenChange: (visible) =>
              !visible && handlePreviewOpenChange(false),
          }}
          src={previewImage}
          alt="Preview"
        />
      )}
    </>
  );
}
