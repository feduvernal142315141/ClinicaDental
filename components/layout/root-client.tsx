"use client";
import { Suspense } from "react";
import { Toaster } from "sonner";
import { Theme } from "@radix-ui/themes";
import { Analytics } from "@vercel/analytics/next";
import { AuthProvider } from "@/contexts/auth-context";
import { AppShell } from "@/components/layout/app-shell";
import { AlertProvider } from "@/contexts/alert-context";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { ThemeProvider } from "@/components/theme-provider";
import { GlobalAlertDialog } from "@/components/global-alert-dialog";
import { InterceptorProvider } from "@/contexts/interceptor-context";
import { GlobalLoadingBar } from "@/components/global-loading-spinner";
import { InterceptorsInitializer } from "@/components/interceptors-initializer";
import { AppShellAntd } from "../ui/antd";

interface RootClientProps {
  children: React.ReactNode;
}

export function RootClient({ children }: RootClientProps) {
  return (
    <AntdRegistry>
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
                  <AppShellAntd>{children}</AppShellAntd>
                </AlertProvider>
              </AuthProvider>
            </InterceptorProvider>
          </Suspense>
          <Toaster position="top-right" richColors closeButton />
          <Analytics />
        </Theme>
      </ThemeProvider>
    </AntdRegistry>
  );
}
