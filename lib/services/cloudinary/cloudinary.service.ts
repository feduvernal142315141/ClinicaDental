/**
 * Image Upload Service
 *
 * Sube imágenes del logo de la clínica con un DRIVER seleccionable:
 *  - "local"     → POST a /api/upload (guarda en public/uploads). Ideal para
 *                  desarrollo: no depende de Cloudinary ni de credenciales.
 *  - "cloudinary"→ unsigned upload DIRECTO desde el navegador a Cloudinary
 *                  (sin pasar por el backend). Para producción.
 *
 * Resolución del driver (sin config → dev=local, prod=cloudinary):
 *   NEXT_PUBLIC_UPLOAD_DRIVER = "local" | "cloudinary"   (override explícito)
 * Cloudinary requiere además (públicas, sin secretos):
 *   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
 *   NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
 *
 * TODA subida tiene timeout (AbortController): si el servidor cuelga o falla,
 * la promesa SIEMPRE se resuelve/rechaza — nunca deja el uploader colgado.
 */
import type {
  CloudinaryErrorResponse,
  CloudinaryUploadResponse,
} from "@/lib/entity/cloudinary";
import {
  CLOUDINARY_ALLOWED_IMAGE_TYPES,
  CLOUDINARY_MAX_IMAGE_BYTES,
} from "@/lib/entity/cloudinary";

/** Resultado de validar un archivo antes de subirlo. */
export type LogoFileValidation =
  | { valid: true }
  | { valid: false; message: string };

export type UploadDriver = "local" | "cloudinary";

const UPLOAD_TIMEOUT_MS = 30_000;

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

/** ¿Cloudinary tiene las variables públicas necesarias para un unsigned upload? */
function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME &&
      process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
  );
}

/**
 * Driver activo. Prioridad:
 *   1. NEXT_PUBLIC_UPLOAD_DRIVER ("local" | "cloudinary") → override explícito.
 *   2. "cloudinary" SOLO en producción Y si está configurado.
 *   3. En cualquier otro caso (local/dev, o prod sin credenciales) → "local".
 *
 * Así el entorno local NUNCA golpea Cloudinary — se evita el 401 por preset
 * firmado o credenciales ausentes — y cae al driver /api/upload.
 */
function resolveDriver(): UploadDriver {
  const explicit = process.env.NEXT_PUBLIC_UPLOAD_DRIVER;
  if (explicit === "local" || explicit === "cloudinary") return explicit;
  if (process.env.NODE_ENV === "production" && isCloudinaryConfigured()) {
    return "cloudinary";
  }
  return "local";
}

/** fetch con timeout: aborta la petición si tarda demasiado (evita el "colgado"). */
async function fetchWithTimeout(
  input: string,
  init: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Driver LOCAL: sube a /api/upload (public/uploads). Devuelve una URL relativa. */
async function uploadLocal(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);

  const response = await fetchWithTimeout("/api/upload", {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(
      body?.error ?? "No se pudo guardar la imagen en el servidor local.",
    );
  }

  const data = (await response.json()) as { url?: string };
  if (!data.url) {
    throw new Error("La subida local no devolvió una URL válida.");
  }
  // El backend exige una URL ABSOLUTA (http(s)://). El driver local devuelve
  // una ruta relativa (/uploads/..) servida por Next; la volvemos absoluta con
  // el origin actual para que pase la validación del backend y renderice igual.
  if (data.url.startsWith("http://") || data.url.startsWith("https://")) {
    return data.url;
  }
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}${data.url}`;
}

/** Driver CLOUDINARY: unsigned upload directo desde el navegador. */
async function uploadCloudinary(file: File): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error(
      "Cloudinary no está configurado. Define NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME y NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET (o usa NEXT_PUBLIC_UPLOAD_DRIVER=local).",
    );
  }

  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", uploadPreset);

  const response = await fetchWithTimeout(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: "POST", body: form },
  );

  if (!response.ok) {
    const errorBody = (await response
      .json()
      .catch(() => null)) as CloudinaryErrorResponse | null;
    const detail = errorBody?.error?.message;
    if (response.status === 401) {
      throw new Error(
        detail ??
          "Cloudinary rechazó la subida (401 Unauthorized): el upload preset debe ser 'unsigned' y el cloud name válido. En local usa el driver 'local' (NEXT_PUBLIC_UPLOAD_DRIVER=local).",
      );
    }
    throw new Error(
      detail ??
        `No se pudo subir la imagen a Cloudinary (HTTP ${response.status}). Revisa el cloud name y el upload preset (debe ser unsigned).`,
    );
  }

  const data = (await response.json()) as CloudinaryUploadResponse;
  if (!data.secure_url) {
    throw new Error("Cloudinary no devolvió una URL válida para la imagen.");
  }
  return data.secure_url;
}

/** Sube una imagen con el driver activo y devuelve su URL. Siempre resuelve o lanza. */
async function uploadImage(file: File): Promise<string> {
  const validation = validateLogoFile(file);
  if (!validation.valid) {
    throw new Error(validation.message);
  }

  try {
    return resolveDriver() === "local"
      ? await uploadLocal(file)
      : await uploadCloudinary(file);
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(
        "La subida tardó demasiado y se canceló. Inténtalo de nuevo.",
      );
    }
    throw err;
  }
}

export const imageUploadService = {
  validateLogoFile,
  uploadImage,
  resolveDriver,
};

/** @deprecated Alias de compatibilidad; usa `imageUploadService`. */
export const cloudinaryService = imageUploadService;
