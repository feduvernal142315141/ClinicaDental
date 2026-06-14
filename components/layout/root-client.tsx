"use client";
import { Suspense } from "react";
import { Theme } from "@radix-ui/themes";
import { Analytics } from "@vercel/analytics/next";
import { AuthProvider } from "@/lib/contexts/auth-context";
import { AlertProvider } from "@/lib/contexts/alert-context";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { ThemeProvider } from "@/components/theme-provider";
import { GlobalAlertDialog } from "@/components/global-alert-dialog";
import { InterceptorProvider } from "@/lib/contexts/interceptor-context";
import { GlobalLoadingBar } from "@/components/global-loading-spinner";
import { InterceptorsInitializer } from "@/components/interceptors-initializer";
import { AppShellAntd, AppLoader } from "../ui/antd";
import { OfflineBanner } from "@/components/features/layout/OfflineBanner";

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
        <AppLoader>
          <Theme>
            <Suspense fallback={null}>
              <InterceptorProvider>
                <AuthProvider>
                  <AlertProvider>
                    <InterceptorsInitializer />
                    <GlobalLoadingBar />
                    <GlobalAlertDialog />
                    <OfflineBanner />
                    <AppShellAntd>{children}</AppShellAntd>
                  </AlertProvider>
                </AuthProvider>
              </InterceptorProvider>
            </Suspense>
            <Analytics />
          </Theme>
        </AppLoader>
      </ThemeProvider>
    </AntdRegistry>
  );
}
