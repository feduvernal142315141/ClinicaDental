"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useInterceptor } from "@/contexts/interceptor-context";
import { setupInterceptorsWithContext } from "@/lib/services/interceptors-context-setup";
import { useAutoLogout } from "@/hooks/use-auto-logout";
import { AutoLogoutWarningModal } from "./auto-logout-warning-modal";
import { AUTO_LOGOUT_CONFIG } from "@/lib/constants/auto-logout";

export function InterceptorsInitializer() {
  const { user, logout } = useAuth();
  const [showWarningModal, setShowWarningModal] = useState(false);

  const interceptorContext = useInterceptor();

  const { resetActivity, clearActivity } = useAutoLogout({
    inactivityTimeMinutes: AUTO_LOGOUT_CONFIG.INACTIVITY_TIME_MINUTES,
    warningTimeMinutes: AUTO_LOGOUT_CONFIG.WARNING_TIME_MINUTES,
    enabled: !!user,
    onWarning: () => {
      console.warn("⚠️ Advertencia: La sesión está por expirar");
      setShowWarningModal(true);
    },
    onLogout: () => {
      console.warn("🔒 Sesión cerrada por inactividad");
      handleAutoLogout();
    },
  });

  useEffect(() => {
    setupInterceptorsWithContext({
      setLoading: interceptorContext.setLoading,
      showNotification: interceptorContext.showNotification,
      handleHttpError: interceptorContext.handleHttpError,
      handleUnauthorized: interceptorContext.handleUnauthorized,
      onActivity: resetActivity,
    });
  }, [resetActivity, interceptorContext]);

  const handleAutoLogout = async () => {
    setShowWarningModal(false);
    clearActivity();
    setTimeout(async () => {
      await logout();
    }, 100);
  };

  const handleContinue = () => {
    setShowWarningModal(false);
    resetActivity();
  };

  return (
    <>
      <AutoLogoutWarningModal
        isOpen={showWarningModal}
        onContinue={handleContinue}
        onLogout={handleAutoLogout}
      />
    </>
  );
}
