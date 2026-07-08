/**
 * Cloudinary Upload Entity Types
 *
 * Tipos mínimos para la subida UNSIGNED directa desde el navegador a
 * Cloudinary (sin pasar por el backend). Solo se tipan los campos que el
 * frontend consume; Cloudinary devuelve muchos más.
 */

/** Respuesta relevante del endpoint `POST /:cloudName/image/upload` de Cloudinary. */
export interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  format?: string;
  bytes?: number;
  width?: number;
  height?: number;
}

/** Forma del error que Cloudinary responde cuando el upload falla. */
export interface CloudinaryErrorResponse {
  error?: {
    message?: string;
  };
}

/** Tipos de imagen aceptados para el logo de la clínica. */
export const CLOUDINARY_ALLOWED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/svg+xml",
] as const;

export const CLOUDINARY_MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2MB
