"use client";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { Theme } from "@radix-ui/themes";
import { Analytics } from "@vercel/analytics/next";
import { AuthProvider } from "@/lib/contexts/auth-context";
import { AlertProvider } from "@/lib/contexts/alert-context";
import { I18nProvider } from "@/lib/contexts/i18n-context";
import { ClinicBrandingProvider } from "@/lib/contexts/clinic-branding-context";
import { ToothNotationProvider } from "@/lib/contexts/tooth-notation-context";
import { AssistantNameProvider } from "@/lib/contexts/assistant-name-context";
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
import { PointerEventsGuard } from "@/components/layout/pointer-events-guard";
import { FeedbackFAB } from "@/components/features/feedback/FeedbackFAB";
import { QueryProvider } from "@/components/layout/query-provider";
import { FinanceModuleBridge } from "@/components/features/billing/module/FinanceModuleBridge";
import { LeadModuleBridge } from "@/components/features/leads/module/LeadModuleBridge";

interface RootClientProps {
  children: React.ReactNode;
}

export function RootClient({ children }: RootClientProps) {
  const pathname = usePathname();
  // Token-based signing is isolated from staff sessions, global error listeners and analytics.
  if (pathname === "/firmar-documento") return <I18nProvider>{children}</I18nProvider>;
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
                <I18nProvider>
                  {/* Marca de la clínica: fuera de AuthProvider a propósito, el
                      endpoint es público y el login (sin sesión) también la
                      consume (auth-shell, login-form). */}
                  <ClinicBrandingProvider>
                    {/* Nomenclatura dental: también ENVUELVE a AuthProvider,
                        que la refresca al completar el login y la limpia en el
                        logout (un proveedor debe ser ancestro de quien lo usa).
                        Su fetch sí exige sesión: sin token no pide nada. */}
                    <ToothNotationProvider>
                      {/* Nombre de la asistente: mismo criterio que la nomenclatura. */}
                      <AssistantNameProvider>
                      <AuthProvider>
                        <QueryProvider>
                        <AlertProvider>
                          <FinanceModuleBridge />
                          <LeadModuleBridge />
                          <GlobalErrorListeners />
                          <PointerEventsGuard />
                          <InterceptorsInitializer />
                          <GlobalLoadingBar />
                          <GlobalAlertDialog />
                          <CommandPalette />
                          <AppChrome>{children}</AppChrome>
                          <FeedbackFAB />
                        </AlertProvider>
                        </QueryProvider>
                      </AuthProvider>
                      </AssistantNameProvider>
                    </ToothNotationProvider>
                  </ClinicBrandingProvider>
                </I18nProvider>
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
