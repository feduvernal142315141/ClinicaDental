/**
 * Marca visible de la clínica (nombre + logo), expuesta por un endpoint
 * PÚBLICO (`GET /clinic/branding`, sin sesión) porque el login la necesita
 * antes de que exista un token. Ver `ClinicBrandingProvider`.
 */
export interface ClinicBranding {
  name: string;
  /** URL absoluta del logo (Cloudinary) o `null` si la clínica no subió uno. */
  logoUrl: string | null;
}

export const DEFAULT_CLINIC_BRANDING: ClinicBranding = {
  name: "Clinic Flow 360",
  logoUrl: null,
};
