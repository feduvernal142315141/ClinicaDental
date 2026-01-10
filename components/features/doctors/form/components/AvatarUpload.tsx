"use client";

import { Upload, Image, ConfigProvider } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useAvatarUpload } from "@/lib/hooks/use-avatar-upload";
import type { UploadFile } from "antd";
import { Button } from "@/components/ui/primitives/shadcn/button";

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
  /** Size for picture-card/picture-circle (both upload button and thumbnail) */
  size?: number;
  /** Disable upload (read-only mode) */
  disabled?: boolean;
}

/**
 * Avatar Upload Component
 *
 * Image uploader with preview support for doctor avatars.
 * Supports single or multiple images with validation.
 * Uses Ant Design's native pictureCardSize token for consistent sizing.
 *
 * @example
 * // Single avatar with default size (picture-circle)
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
 * // Custom size avatar (300px)
 * <AvatarUpload
 *   maxCount={1}
 *   listType="picture-card"
 *   size={300}
 *   onFileListChange={(files) => form.setFieldValue('avatar', files)}
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
 */
export function AvatarUpload({
  initialFileList,
  action,
  maxSizeMB = 2,
  allowedFormats,
  maxCount = 1,
  onFileListChange,
  listType = "picture-circle",
  size = 320,
  disabled = false,
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
    <Button
      type="text"
      htmlType="button"
      className="flex flex-col items-center justify-center w-full h-full"
    >
      <PlusOutlined className="text-2xl mb-2" />
      <div className="text-sm">Subir foto</div>
    </Button>
  );

  return (
    <ConfigProvider
      theme={{
        components: {
          Upload: {
            // Controls size for both upload button AND thumbnails in picture-card/picture-circle
            pictureCardSize: size,
          },
        },
      }}
    >
      <Upload
        action={action}
        listType={listType}
        fileList={fileList}
        beforeUpload={beforeUpload}
        onPreview={handlePreview}
        onChange={handleChange}
        maxCount={maxCount}
        accept={allowedFormats?.join(",") || "image/jpeg,image/png,image/jpg"}
        className="avatar-upload"
        disabled={disabled}
        showUploadList={{
          showRemoveIcon: !disabled,
        }}
      >
        {fileList.length >= maxCount || disabled ? null : uploadButton}
      </Upload>

      {/* Preview Modal */}
      {previewImage && (
        <Image
          styles={{ root: { display: "none" } }}
          preview={{
            open: previewOpen,
            onOpenChange: handlePreviewOpenChange,
            afterOpenChange: (visible) =>
              !visible && handlePreviewOpenChange(false),
          }}
          src={previewImage}
          alt="Preview"
        />
      )}
    </ConfigProvider>
  );
}
