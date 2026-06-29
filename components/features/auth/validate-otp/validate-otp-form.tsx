"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/primitives/shadcn/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/atomic/forms/input-otp";
import { AuthShell } from "../components/auth-shell";
import { AuthCard } from "../components/auth-card";
import {
  loadOtpPassword,
  loadOtpSession,
  saveOtpSession,
} from "@/lib/auth/otp-session";
import { doctorAuthService } from "@/lib/services/doctors";
import { useAuth } from "@/lib/contexts/auth-context";
import { notify } from "@/lib/utils/notify";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

type OtpValidationState = "idle" | "validating" | "success" | "error";

const WAVE_DELAYS = [
  "[animation-delay:0ms]",
  "[animation-delay:75ms]",
  "[animation-delay:150ms]",
  "[animation-delay:225ms]",
  "[animation-delay:300ms]",
  "[animation-delay:375ms]",
] as const;

function getSlotClassName(index: number, state: OtpValidationState): string {
  const base = "h-12 w-12 rounded-xl border text-lg font-semibold";
  if (state === "success") {
    return `${base} border-emerald-500 !border-emerald-500 bg-emerald-500/10 shadow-[0_0_0_3px_rgba(34,197,94,0.25)] animate-otp-wave ${WAVE_DELAYS[index] ?? ""}`;
  }
  if (state === "error") {
    return `${base} border-rose-500 !border-rose-500 bg-rose-500/10`;
  }
  return `${base} border-hairline`;
}

export function ValidateOtpForm() {
  const router = useRouter();
  const { loading, authError, completeOtpLogin } = useAuth();

  const [otp, setOtp] = useState("");
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [validationState, setValidationState] =
    useState<OtpValidationState>("idle");
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const prevLoadingRef = useRef(false);

  // La sesión OTP vive en storage del cliente: se carga DESPUÉS de montar para
  // que el render del servidor y la primera hidratación coincidan (sin mismatch).
  const [session, setSession] =
    useState<ReturnType<typeof loadOtpSession>>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const email = session?.email ?? "";

  useEffect(() => {
    setSession(loadOtpSession());
    setSessionLoaded(true);
  }, []);

  useEffect(() => {
    if (!sessionLoaded) return;
    if (!session?.otpExpiresAt) {
      setLocalError(
        "Sesión OTP no encontrada. Puedes probar el formulario sin redirección.",
      );
      return;
    }
    setLocalError(null);

    const tick = () => {
      const expiresAtMs = new Date(session.otpExpiresAt).getTime();
      const now = Date.now();
      const diffSeconds = Math.max(0, Math.floor((expiresAtMs - now) / 1000));
      setTimeLeft(diffSeconds);
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [router, session, sessionLoaded]);

  // Detección éxito/error (CR-1: NO chequear authError post-await)
  useEffect(() => {
    if (
      prevLoadingRef.current &&
      !loading &&
      validationState === "validating"
    ) {
      if (authError) {
        setValidationState("error");
      } else {
        setValidationState("success");
      }
    }
    prevLoadingRef.current = loading;
  }, [loading, authError, validationState]);

  // Timer overlay éxito con cleanup (CR-6)
  useEffect(() => {
    if (validationState !== "success") return;
    const timer = setTimeout(() => setShowSuccessOverlay(true), 600);
    return () => clearTimeout(timer);
  }, [validationState]);

  const canVerify =
    otp.length === 6 && !loading && validationState !== "success";
  const canResend = timeLeft === 0 && !resendLoading;

  const handleVerify = async () => {
    setLocalError(null);
    if (!email) {
      setLocalError("Sesión OTP no encontrada. Vuelve a iniciar sesión.");
      return;
    }
    setValidationState("validating");
    await completeOtpLogin(otp);
  };

  const handleResend = async () => {
    setValidationState("idle");
    setShowSuccessOverlay(false);
    setLocalError(null);
    const password = loadOtpPassword();
    if (!email || !password) {
      setLocalError("Para reenviar el código, vuelve a iniciar sesión.");
      return;
    }

    setResendLoading(true);
    try {
      const newOtp = await doctorAuthService.login({ email, password });
      saveOtpSession({
        email,
        otpExpiresAt: newOtp.otpExpiresAt,
        otpExpiresInSeconds: newOtp.otpExpiresInSeconds,
      });
      notify.success("Código reenviado", {
        description:
          "Te enviamos un nuevo código a tu correo. Revísalo e ingrésalo para continuar.",
      });
      setOtp("");
      router.refresh();
    } catch (e) {
      setLocalError(
        e instanceof Error ? e.message : "No se pudo reenviar el código",
      );
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <AuthShell>
      <AuthCard
        title="Verifica tu identidad"
        icon={<ShieldCheck className="h-7 w-7" />}
        description={
          <>
            Ingresa el código de 6 dígitos enviado a{" "}
            <span className="font-medium text-ink">{email || "tu correo"}</span>.
          </>
        }
        footer={
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => router.push("/login")}
            disabled={loading || resendLoading || validationState === "success"}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al inicio de sesión
          </Button>
        }
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className={`transition-all duration-300 ${
              showSuccessOverlay ? "scale-[0.99] opacity-35" : "opacity-100"
            }`}
          >
            <InputOTP
              containerClassName={`transition-transform duration-300 ${
                validationState === "error"
                  ? "animate-otp-shake"
                  : validationState === "success"
                    ? "scale-[1.02]"
                    : ""
              }`}
              maxLength={6}
              value={otp}
              onChange={(value) => {
                setOtp(value);
                if (validationState === "error") setValidationState("idle");
              }}
              inputMode="numeric"
              pattern="^[0-9]*$"
              disabled={loading || validationState === "success"}
            >
              <InputOTPGroup className="gap-2">
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <InputOTPSlot
                    key={index}
                    index={index}
                    className={getSlotClassName(index, validationState)}
                  />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>

          <div
            className="flex min-h-7 items-center justify-center"
            aria-live="polite"
          >
            {showSuccessOverlay ? (
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/12 px-3 py-1.5 text-sm font-semibold text-emerald-600 ring-1 ring-emerald-500/20 dark:text-emerald-300">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Iniciando sesión...</span>
              </div>
            ) : (
              <div className="text-sm text-subtle">
                {timeLeft > 0 ? (
                  <>
                    Expira en{" "}
                    <span className="font-medium tabular-nums text-ink">
                      {formatTime(timeLeft)}
                    </span>
                  </>
                ) : (
                  <>El código expiró. Puedes reenviarlo.</>
                )}
              </div>
            )}
          </div>

          {authError || localError ? (
            <div
              role="alert"
              className="flex w-full items-start gap-2 rounded-xl border border-rose-400/25 bg-rose-500/10 p-3 text-sm text-rose-600 dark:text-rose-300"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{authError || localError}</span>
            </div>
          ) : null}

          <div className="flex w-full gap-2">
            <Button
              className="auth-sheen relative h-11 flex-1 overflow-hidden bg-brand text-white hover:bg-brand-strong"
              onClick={handleVerify}
              disabled={!canVerify}
              loading={loading}
            >
              Verificar
            </Button>
            <Button
              className="h-11 flex-1"
              variant="outline"
              onClick={handleResend}
              disabled={!canResend}
              loading={resendLoading}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {resendLoading ? "Reenviando..." : "Reenviar"}
            </Button>
          </div>
        </div>
      </AuthCard>
    </AuthShell>
  );
}
