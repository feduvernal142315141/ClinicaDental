"use client";

import { Control, Controller } from "react-hook-form";
import { Input } from "@/components/ui/atomic/forms/input";
import { Label } from "@/components/ui/atomic/forms/label";

interface TextFieldProps {
  name: string;
  control: Control<any>;
  label?: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  error?: string;
}

export function TextField({
  name,
  control,
  label,
  placeholder,
  type = "text",
  required,
  error,
}: TextFieldProps) {
  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor={name}>
          {label}
          {required && <span className="text-destructive">*</span>}
        </Label>
      )}
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Input
            {...field}
            id={name}
            type={type}
            placeholder={placeholder}
            className={error ? "border-destructive" : ""}
          />
        )}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
