export type OtpSession = {
  email: string;
  otpExpiresAt: string;
  otpExpiresInSeconds: number;
  /**
   * La clínica con la que se pidió el código. Se guarda porque el segundo paso
   * ocurre en otra página: sin esto, /auth/validate-otp no sabría con qué slug
   * se generó el OTP y ningún login llegaría a completarse.
   */
  clinicSlug: string;
};

const STORAGE_KEY = "clinic_otp_session";
const OTP_PASSWORD_KEY = "clinic_otp_password";

export function saveOtpSession(session: OtpSession) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function saveOtpPassword(password: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(OTP_PASSWORD_KEY, password);
}

export function loadOtpPassword(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(OTP_PASSWORD_KEY);
}

export function loadOtpSession(): OtpSession | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as OtpSession;
    if (!parsed?.email || !parsed?.otpExpiresAt) return null;
    // Una sesión escrita antes de que el slug existiera no sirve para validar:
    // mejor devolver null y mandar a repetir el login que fallar en el paso dos.
    if (!parsed?.clinicSlug) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearOtpSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(OTP_PASSWORD_KEY);
}
