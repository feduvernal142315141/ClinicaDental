/**
 * Image Upload Service
 *
 * Sube el logo de la clínica al BACKEND (POST /api/v1/cloudinary/upload,
 * multipart/form-data, firmado con el Bearer del usuario) a través del axios
 * autenticado (`apiConfig.ts`). El backend reenvía la imagen a Cloudinary y
 * devuelve `secureUrl`. El frontend NUNCA habla directo con Cloudinary
 * (ya no hay driver local ni unsigned upload).
 */
import apiInstance from "@/lib/services/apiConfig";
import { normalizeError } from "@/lib/errors/normalize-error";
import type { CloudinaryUploadResponse } from "@/lib/entity/cloudinary";
import {
  CLOUDINARY_ALLOWED_IMAGE_TYPES,
  CLOUDINARY_MAX_IMAGE_BYTES,
} from "@/lib/entity/cloudinary";

/** Resultado de validar un archivo antes de subirlo. */
export type LogoFileValidation =
  | { valid: true }
  | { valid: false; message: string };

/** Valida tipo y tamaño de la imagen ANTES de intentar subirla. */
function validateLogoFile(file: File): LogoFileValidation {
  const isAllowedType = (
    CLOUDINARY_ALLOWED_IMAGE_TYPES as readonly string[]
  ).includes(file.type);

  if (!isAllowedType) {
    return {
      valid: false,
      message: "Formato no válido. Usa una imagen PNG, JPG, WEBP o SVG.",
    };
  }

  if (file.size > CLOUDINARY_MAX_IMAGE_BYTES) {
    return {
      valid: false,
      message: "La imagen supera el tamaño máximo permitido de 2MB.",
    };
  }

  return { valid: true };
}

/**
 * Sube una imagen al backend (`POST /api/v1/cloudinary/upload`) y devuelve la
 * `secureUrl` que Cloudinary asignó. Siempre resuelve o lanza un `Error` con
 * mensaje seguro en español (apto para mostrar en un toast).
 *
 * `folder` agrupa la imagen en Cloudinary (p.ej. "logos" para el logo de la
 * clínica, "doctors" para la foto del doctor). Por defecto "logos" para
 * preservar el comportamiento existente de los callers que no lo pasan.
 */
async function uploadImage(file: File, folder = "logos"): Promise<string> {
  const validation = validateLogoFile(file);
  if (!validation.valid) {
    throw new Error(validation.message);
  }

  const form = new FormData();
  form.append("file", file);
  form.append("folder", folder);

  let response;
  try {
    response = await apiInstance.post<CloudinaryUploadResponse>(
      "/api/v1/cloudinary/upload",
      form,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
  } catch (err) {
    // Solo errores de red/HTTP pasan por normalizeError (mensaje seguro en es).
    const appError = normalizeError(err);
    throw new Error(
      appError.userMessage || "No se pudo subir la imagen. Inténtalo de nuevo.",
    );
  }

  // Fuera del try para conservar el mensaje específico (no colapsarlo a genérico).
  const secureUrl = response.data?.secureUrl;
  if (!secureUrl) {
    throw new Error("El servidor no devolvió una URL válida para la imagen.");
  }
  return secureUrl;
}

export const imageUploadService = {
  validateLogoFile,
  uploadImage,
};
