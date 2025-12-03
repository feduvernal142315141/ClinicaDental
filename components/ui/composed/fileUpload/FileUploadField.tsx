"use client";

import * as React from "react";
import { Control, Controller, FieldValues, Path } from "react-hook-form";
import { FileUpload } from "./FileUpload";
import { Label } from "@/components/ui/atomic/forms/label";

interface FileUploadFieldProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label?: string;
  required?: boolean;
  accept?: string;
  maxSize?: number;
  error?: string;
  onFileNameChange?: (fileName: string) => void;
}

export function FileUploadField<T extends FieldValues>({
  name,
  control,
  label,
  required,
  accept,
  maxSize,
  error,
  onFileNameChange,
}: FileUploadFieldProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <div className="space-y-2">
          {label && (
            <Label htmlFor={name}>
              {label}
              {required && <span className="text-red-500 ml-1">*</span>}
            </Label>
          )}
          <FileUpload
            onFileSelect={(file, base64) => {
              field.onChange(base64);
              onFileNameChange?.(file.name);
            }}
            onFileRemove={() => {
              field.onChange("");
              onFileNameChange?.("");
            }}
            accept={accept}
            maxSize={maxSize}
            preview={field.value || null}
          />
          {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
        </div>
      )}
    />
  );
}
