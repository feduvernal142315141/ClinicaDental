import { servicePost } from "@/lib/services/baseService";

export type CreateAuthSessionInput = {
  accessToken: string;
  refreshToken: string;
};

export type CreateAuthSessionResponse = {
  ok: boolean;
};

function resolveSameOriginUrl(path: string): string {
  if (typeof window === "undefined") return path;
  return new URL(path, window.location.origin).toString();
}

/**
 * Crea la sesión en el frontend (cookies) vía Next API.
 * Nota: se usa URL absoluta porque el apiInstance tiene baseURL al backend.
 */
export async function createAuthSession(
  input: CreateAuthSessionInput
): Promise<CreateAuthSessionResponse> {
  const url = resolveSameOriginUrl("/api/auth/session");

  const response = await servicePost<
    CreateAuthSessionInput,
    CreateAuthSessionResponse
  >(url, input);

  if (response?.status >= 200 && response?.status < 300 && response?.data) {
    return response.data;
  }

  const errorMessage =
    response?.data?.message ||
    response?.data?.details ||
    "Failed to create auth session";
  throw new Error(errorMessage);
}
