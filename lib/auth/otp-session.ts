export type OtpSession = {
  email: string;
  otpExpiresAt: string;
  otpExpiresInSeconds: number;
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
