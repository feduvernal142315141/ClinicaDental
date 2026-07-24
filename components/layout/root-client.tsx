"use client";
import { Suspense } from "react";
import { Theme } from "@radix-ui/themes";
import { Analytics } from "@vercel/analytics/next";
import { AuthProvider } from "@/lib/contexts/auth-context";
import { AlertProvider } from "@/lib/contexts/alert-context";
import { ClinicBrandingProvider } from "@/lib/contexts/clinic-branding-context";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { ThemeProvider } from "@/components/theme-provider";
import { GlobalAlertDialog } from "@/components/global-alert-dialog";
import { InterceptorProvider } from "@/lib/contexts/interceptor-context";
import { GlobalLoadingBar } from "@/components/global-loading-spinner";
import { InterceptorsInitializer } from "@/components/interceptors-initializer";
import { SileoToaster } from "@/components/ui/atomic/feedback/sileo-toaster";
import { AntdCompatProvider } from "@/components/layout/antd-compat-provider";
import { AppChrome } from "@/components/layout/app-chrome";
import { CommandPalette } from "@/components/ui/navigation/command-palette";
import { GlobalErrorListeners } from "@/components/layout/global-error-listeners";
import { FeedbackFAB } from "@/components/features/feedback/FeedbackFAB";

interface RootClientProps {
  children: React.ReactNode;
}

export function RootClient({ children }: RootClientProps) {
  return (
    // AntdRegistry + AntdCompatProvider se conservan hasta retirar antd por
    // completo (componentes/modales antd aún en uso en varias pantallas).
    <AntdRegistry>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <AntdCompatProvider>
          <Theme>
            <Suspense fallback={null}>
              <InterceptorProvider>
                {/* Marca de la clínica: fuera de AuthProvider a propósito, el
                    endpoint es público y el login (sin sesión) también la
                    consume (auth-shell, login-form). */}
                <ClinicBrandingProvider>
                  <AuthProvider>
                    <AlertProvider>
                      <GlobalErrorListeners />
                      <InterceptorsInitializer />
                      <GlobalLoadingBar />
                      <GlobalAlertDialog />
                      <CommandPalette />
                      <AppChrome>{children}</AppChrome>
                      <FeedbackFAB />
                    </AlertProvider>
                  </AuthProvider>
                </ClinicBrandingProvider>
              </InterceptorProvider>
            </Suspense>
            <Analytics />
          </Theme>
        </AntdCompatProvider>
        <SileoToaster />
      </ThemeProvider>
    </AntdRegistry>
  );
}
