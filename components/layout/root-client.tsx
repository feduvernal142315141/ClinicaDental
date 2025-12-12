"use client";

import { Suspense } from "react";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "@/components/theme-provider";
import { InterceptorProvider } from "@/contexts/interceptor-context";
import { AuthProvider } from "@/contexts/auth-context";
import { AlertProvider } from "@/contexts/alert-context";
import { InterceptorsInitializer } from "@/components/interceptors-initializer";
import { GlobalLoadingBar } from "@/components/global-loading-spinner";
import { GlobalAlertDialog } from "@/components/global-alert-dialog";
import { Theme } from "@radix-ui/themes";
import { Toaster } from "sonner";
import { AppShell } from "@/components/layout/app-shell";

interface RootClientProps {
  children: React.ReactNode;
}

export function RootClient({ children }: RootClientProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <Theme>
        <Suspense fallback={null}>
          <InterceptorProvider>
            <AuthProvider>
              <AlertProvider>
                <InterceptorsInitializer />
                <GlobalLoadingBar />
                <GlobalAlertDialog />
                <AppShell>{children}</AppShell>
              </AlertProvider>
            </AuthProvider>
          </InterceptorProvider>
        </Suspense>
        <Toaster position="top-right" richColors closeButton />
        <Analytics />
      </Theme>
    </ThemeProvider>
  );
}
