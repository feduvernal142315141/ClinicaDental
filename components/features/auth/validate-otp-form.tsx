"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/primitives/shadcn/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/atomic/forms/input-otp";
import { AuthFormCard } from "./auth-form-card";
import {
  loadOtpPassword,
  loadOtpSession,
  saveOtpSession,
} from "@/lib/auth/otp-session";
import { doctorAuthService } from "@/lib/services/doctors";
import { useAuth } from "@/contexts/auth-context";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function ValidateOtpForm() {
  const router = useRouter();
  const { loading, authError, completeOtpLogin } = useAuth();

  const [otp, setOtp] = useState("");
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

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

  const canVerify = otp.length === 6 && !loading;
  const canResend = timeLeft === 0 && !resendLoading;

  const handleVerify = async () => {
    setLocalError(null);
    if (!email) {
      setLocalError("Sesión OTP no encontrada. Vuelve a iniciar sesión.");
      return;
    }

    await completeOtpLogin(otp);
  };

  const handleResend = async () => {
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
      <div className="flex items-center justify-center">
        <InputOTP
          maxLength={6}
          value={otp}
          onChange={setOtp}
          inputMode="numeric"
          pattern="^[0-9]*$"
          disabled={loading}
        >
          <InputOTPGroup className="gap-2">
            <InputOTPSlot
              className="border border-blue-500 rounded-md"
              index={0}
            />
            <InputOTPSlot
              className="border border-blue-500 rounded-md"
              index={1}
            />
            <InputOTPSlot
              className="border border-blue-500 rounded-md"
              index={2}
            />
            <InputOTPSlot
              className="border border-blue-500 rounded-md"
              index={3}
            />
            <InputOTPSlot
              className="border border-blue-500 rounded-md"
              index={4}
            />
            <InputOTPSlot
              className="border border-blue-500 rounded-md"
              index={5}
            />
          </InputOTPGroup>
        </InputOTP>
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
        className="w-full"
        onClick={() => router.push("/login")}
        disabled={loading || resendLoading}
      >
        Volver al login
      </Button>
    </AuthFormCard>
  );
}
