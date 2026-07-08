"use client";

import * as React from "react";
import { ImageUp, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { notify } from "@/lib/utils/notify";
import { imageUploadService } from "@/lib/services/cloudinary";

export interface LogoUploaderProps {
  /** URL absoluta del logo actual (o `null`/vacío si no hay). */
  value?: string | null;
  /**
   * Se llama con la `secure_url` de Cloudinary tras subir, o `null` al quitar.
   * Opcional en el tipo para permitir su uso fuera de un `Controller` de RHF
   * (p. ej. en un preview de solo lectura); dentro de un form se cablea con
   * `field.onChange` (ver `ClinicInfoFields`).
   */
  onChange?: (url: string | null) => void;
  disabled?: boolean;
  className?: string;
  /**
   * Id del control primario (botón "Subir/Cambiar logo") para asociarlo con
   * el `FormLabel` externo (`htmlFor`). Dentro de un `Controller` de RHF se
   * cablea con `formItemId` (ver `ClinicInfoFields`); es la única acción del
   * grupo que representa "el campo" para el label — el resto (quitar logo,
   * input de archivo oculto) ya expone su propio nombre accesible.
   */
  id?: string;
}

/**
 * Subida del logo de la clínica (Bento, sin Ant Design).
 *
 * Sube el archivo DIRECTO a Cloudinary (unsigned upload) desde el navegador
 * — sin pasar por el backend — y reporta la `secure_url` resultante vía
 * `onChange`. Mientras sube muestra un preview local inmediato (object URL);
 * si Cloudinary responde error, revierte al valor anterior.
 *
 * Expone `value`/`onChange` con la forma de un control controlado estándar,
 * por lo que se integra vía `Controller`/`FormField` de react-hook-form
 * (ver `ClinicInfoFields`).
 */
export function LogoUploader({
  value,
  onChange,
  disabled = false,
  className,
  id,
}: LogoUploaderProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const mountedRef = React.useRef(true);
  const objectUrlRef = React.useRef<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [localPreview, setLocalPreview] = React.useState<string | null>(null);

  React.useEffect(
    () => () => {
      mountedRef.current = false;
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    },
    [],
  );

  const pick = () => {
    if (!disabled && !uploading) inputRef.current?.click();
  };

  const handleFile = async (file: File) => {
    const validation = imageUploadService.validateLogoFile(file);
    if (!validation.valid) {
      notify.error("No se pudo subir el logo", {
        description: validation.message,
      });
      return;
    }

    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const previewUrl = URL.createObjectURL(file);
    objectUrlRef.current = previewUrl;
    setLocalPreview(previewUrl);
    setUploading(true);

    try {
      const secureUrl = await imageUploadService.uploadImage(file);
      if (!mountedRef.current) return;
      onChange?.(secureUrl);
      notify.success("Logo actualizado", {
        description:
          "El nuevo logo se subió correctamente. Guarda la configuración para aplicarlo.",
      });
    } catch (err) {
      // Falla la subida: revierte el preview local y muestra el error.
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      if (!mountedRef.current) return;
      setLocalPreview(null);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "No se pudo subir el logo. Inténtalo de nuevo.";
      notify.error("No se pudo subir el logo", {
        description: errorMessage,
      });
    } finally {
      // Se ejecuta SIEMPRE (éxito, error o abort) → nunca deja "Subiendo…".
      if (mountedRef.current) setUploading(false);
    }
  };

  const displayUrl = localPreview ?? value ?? null;

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <div
        aria-busy={uploading}
        className={cn(
          "relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-bento border border-dashed border-hairline bg-elevated",
        )}
      >
        {displayUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={displayUrl}
            alt="Logo de la clínica"
            className="h-full w-full object-contain p-2"
          />
        ) : (
          <ImageUp className="h-7 w-7 text-subtle" />
        )}

        {uploading && (
          <div className="absolute inset-0 grid place-items-center bg-black/40">
            <Loader2 className="h-5 w-5 animate-spin text-white" />
          </div>
        )}
      </div>

      <div className="flex flex-col items-start gap-1">
        <button
          id={id}
          type="button"
          onClick={pick}
          disabled={disabled || uploading}
          className="rounded-md border border-hairline bg-surface px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? "Subiendo…" : value ? "Cambiar logo" : "Subir logo"}
        </button>

        {value && !disabled && !uploading && (
          <button
            type="button"
            onClick={() => {
              if (objectUrlRef.current) {
                URL.revokeObjectURL(objectUrlRef.current);
                objectUrlRef.current = null;
              }
              setLocalPreview(null);
              onChange?.(null);
            }}
            className="flex items-center gap-1 text-xs text-subtle hover:text-rose-600"
          >
            <X className="h-3.5 w-3.5" />
            Quitar logo
          </button>
        )}

        <p className="text-xs text-subtle">PNG, JPG, WEBP o SVG. Máximo 2MB.</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
        disabled={disabled || uploading}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
