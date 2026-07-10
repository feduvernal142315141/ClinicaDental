/**
 * Cloudinary Upload Entity Types
 *
 * Tipos de la respuesta del endpoint del BACKEND `POST /api/v1/cloudinary/upload`
 * (subida firmada; el backend reenvía a Cloudinary). El frontend nunca habla
 * directo con Cloudinary. Solo se tipan los campos que el frontend consume.
 */

/** Respuesta (camelCase) del endpoint `POST /api/v1/cloudinary/upload` del backend. */
export interface CloudinaryUploadResponse {
  publicId: string;
  url: string;
  secureUrl: string;
  resourceType?: string;
  format?: string;
  bytes?: number;
  width?: number;
  height?: number;
  createdAt?: string;
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
