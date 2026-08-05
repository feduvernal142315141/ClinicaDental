"use client";

import * as React from "react";
import { Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { notify } from "@/lib/utils/notify";

export interface AvatarFieldProps {
  /** Imagen actual (base64 data-url o URL). "" si vacía. */
  value?: string;
  onChange: (value: string) => void;
  size?: number;
  disabled?: boolean;
  maxSizeMB?: number;
  allowedFormats?: string[];
  /** Lado máximo (px) al que se reescala la imagen antes de generar base64. */
  maxDimension?: number;
  className?: string;
  /** Forma del marco. "circle" (avatar) por defecto; "square" para símbolos/iconos. */
  shape?: "circle" | "square";
  /** Texto del botón vacío. */
  label?: string;
  /** Texto del enlace para cambiar la imagen. */
  changeLabel?: string;
  /** alt de la imagen. */
  alt?: string;
  /**
   * Si se provee, sube el archivo a través de este callback (p.ej. Cloudinary
   * vía el backend) y emite la URL https resultante por `onChange` en vez de
   * generar base64. Úsalo cuando el contrato del campo espera una URL
   * persistida (no un data-url).
   */
  uploader?: (file: File) => Promise<string>;
}

const DEFAULT_FORMATS = ["image/jpeg", "image/png"];

/**
 * Reescala la imagen a `max` px de lado mayor y devuelve un data-url JPEG.
 * Reduce drásticamente el peso del base64 que se envía en el payload.
 */
function downscaleToDataUrl(file: File, max: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = () => reject(new Error("No se pudo cargar la imagen."));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
    reader.readAsDataURL(file);
  });
}

/**
 * Subida de avatar corporativa (Bento) sin Ant Design. Dropzone circular con
 * borde punteado + input file oculto. Si se pasa `uploader`, sube el archivo
 * a través de él (p.ej. Cloudinary vía el backend) y emite la URL https
 * resultante por `onChange`. Si no, conserva el comportamiento base64
 * (reescala vía canvas y emite un data-url) para consumidores que no
 * necesitan persistir una URL.
 */
export function AvatarField({
  value,
  onChange,
  size = 180,
  disabled = false,
  maxSizeMB = 2,
  allowedFormats = DEFAULT_FORMATS,
  maxDimension = 512,
  className,
  shape = "circle",
  label = "Subir foto",
  changeLabel = "Cambiar foto",
  alt = "Imagen",
  uploader,
}: AvatarFieldProps) {
  const radiusClass = shape === "square" ? "rounded-xl" : "rounded-full";
  const inputRef = React.useRef<HTMLInputElement>(null);
  const mountedRef = React.useRef(true);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    // Reponer a `true` en CADA montaje: bajo React 18 Strict Mode (dev) el
    // componente se monta → desmonta → remonta, y si solo se pusiera `false`
    // en el cleanup, `mountedRef` quedaría en `false` de por vida — dejando el
    // uploader colgado en "Subiendo…" (el `finally` no llegaría a
    // `setLoading(false)`) y con `onChange` nunca disparado. (Mismo patrón que
    // LogoUploader.)
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const pick = () => {
    if (!disabled) inputRef.current?.click();
  };

  const handleFile = async (file: File) => {
    if (!allowedFormats.includes(file.type)) {
      notify.error("Formato de imagen no permitido", {
        description: "Solo se aceptan archivos JPG o PNG. Elige una foto en alguno de esos formatos.",
      });
      return;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      notify.error("La imagen es demasiado pesada", {
        description: `El archivo supera el límite de ${maxSizeMB} MB. Reduce su tamaño o elige una foto más liviana.`,
      });
      return;
    }
    setLoading(true);
    try {
      if (uploader) {
        const url = await uploader(file);
        if (mountedRef.current) onChange(url);
      } else {
        const dataUrl = await downscaleToDataUrl(file, maxDimension);
        if (mountedRef.current) onChange(dataUrl);
      }
    } catch (err) {
      const description =
        uploader && err instanceof Error && err.message
          ? err.message
          : "Hubo un problema al preparar la foto. Inténtalo de nuevo o prueba con otra imagen.";
      notify.error("No se pudo procesar la imagen", { description });
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div
        aria-busy={loading}
        className={cn(
          "relative overflow-hidden border border-dashed border-hairline bg-elevated",
          radiusClass,
        )}
        style={{ width: size, height: size }}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt={alt} className="h-full w-full object-cover" />
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={pick}
            className="flex h-full w-full flex-col items-center justify-center gap-1 text-subtle transition-colors hover:bg-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <Plus className="h-7 w-7" />
            )}
            <span className="text-xs">{label}</span>
          </button>
        )}

        {value && loading && (
          <div className="absolute inset-0 grid place-items-center bg-black/40">
            <Loader2 className="h-6 w-6 animate-spin text-white" />
          </div>
        )}

      </div>

      {/* Acciones DEBAJO de la imagen, nunca encima.
          Antes "Quitar" era una X flotante sobre la foto: con `size` pequeño
          (p.ej. el avatar de 112px de la ficha del paciente) sus 28px fijos se
          comían un tercio del círculo y tapaban justo la cara. Como texto no
          estorba a ningún tamaño y además es alcanzable en táctil, donde un
          control que dependa de :hover no existe. */}
      {value && !disabled && (
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={pick}
            className="rounded text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            {changeLabel}
          </button>
          <span aria-hidden="true" className="text-hairline">
            ·
          </span>
          <button
            type="button"
            onClick={() => onChange("")}
            className="rounded text-subtle transition-colors hover:text-rose-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40"
          >
            Quitar
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={allowedFormats.join(",")}
        disabled={disabled}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
