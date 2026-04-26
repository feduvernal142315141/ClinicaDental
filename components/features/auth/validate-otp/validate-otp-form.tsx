"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/primitives/shadcn/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/atomic/forms/input-otp";
import { AuthFormCard } from "../components/auth-form-card";
import {
  loadOtpPassword,
  loadOtpSession,
  saveOtpSession,
} from "@/lib/auth/otp-session";
import { doctorAuthService } from "@/lib/services/doctors";
import { useAuth } from "@/lib/contexts/auth-context";

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
  const base = "rounded-md border";
  if (state === "success") {
    return `${base} border-green-500 !border-green-500 bg-green-50 shadow-[0_0_0_3px_rgba(34,197,94,0.25)] animate-otp-wave ${WAVE_DELAYS[index] ?? ""}`;
  }
  if (state === "error") {
    return `${base} border-red-500 !border-red-500 animate-otp-shake`;
  }
  // idle | validating — sin cambio visual extra
  return `${base} border-blue-500`;
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

  const session = useMemo(() => loadOtpSession(), []);
  const email = session?.email ?? "";

  useEffect(() => {
    if (!session?.otpExpiresAt) {
      setLocalError(
        "Sesión OTP no encontrada. Puedes probar el formulario sin redirección."
      );
      return;
    }

    const tick = () => {
      const expiresAtMs = new Date(session.otpExpiresAt).getTime();
      const now = Date.now();
      const diffSeconds = Math.max(0, Math.floor((expiresAtMs - now) / 1000));
      setTimeLeft(diffSeconds);
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [router, session]);

  // Detección éxito/error (CR-1: NO chequear authError post-await)
  useEffect(() => {
    if (prevLoadingRef.current && !loading && validationState === "validating") {
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

  const canVerify = otp.length === 6 && !loading && validationState !== "success";
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
      setOtp("");
      router.refresh();
    } catch (e) {
      setLocalError(
        e instanceof Error ? e.message : "No se pudo reenviar el código"
      );
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <AuthFormCard
      title="Validar código"
      description={
        <>Ingresa el código de 6 dígitos enviado a {email || "tu correo"}.</>
      }
    >
      <div className="relative flex items-center justify-center">
        <InputOTP
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

        {showSuccessOverlay && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 rounded-md gap-1.5">
            <div className="h-5 w-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-semibold text-green-700">
              Iniciando sesión...
            </span>
          </div>
        )}
      </div>

      <div className="text-center text-sm text-muted-foreground">
        {timeLeft > 0 ? (
          <>Expira en {formatTime(timeLeft)}</>
        ) : (
          <>El código expiró. Puedes reenviarlo.</>
        )}
      </div>

      {(authError || localError) && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
          {authError || localError}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          className="flex-1"
          onClick={handleVerify}
          disabled={!canVerify}
          loading={loading}
        >
          Verificar
        </Button>
        <Button
          className="flex-1"
          variant="outline"
          onClick={handleResend}
          disabled={!canResend}
          loading={resendLoading}
        >
          {resendLoading ? "Reenviando..." : "Reenviar"}
        </Button>
      </div>

      <Button
        variant="ghost"
        className="w-full text-black"
        onClick={() => router.push("/login")}
        disabled={loading || resendLoading}
      >
        Volver al login
      </Button>
    </AuthFormCard>
  );
}
