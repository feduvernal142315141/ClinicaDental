import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { AuthProvider } from "@/contexts/auth-context"
import { InterceptorProvider } from "@/contexts/interceptor-context"
import { Suspense } from "react"
import "@radix-ui/themes/styles.css"
import "./globals.css"
import { AlertProvider } from "@/contexts/alert-context"
import { Toaster } from "sonner"
import { InterceptorsInitializer } from "@/components/interceptors-initializer"
import { GlobalLoadingBar } from "@/components/global-loading-spinner"
import { GlobalAlertDialog } from "@/components/global-alert-dialog"
import { Theme } from "@radix-ui/themes"

export const metadata: Metadata = {
  title: "Sistema Médico Dental",
  description: "Created by Kode Wave Solutions S.A",
  generator: "v1.0.0",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <Theme>
          <Suspense fallback={null}>
            {/* InterceptorProvider debe estar antes de AuthProvider para que esté disponible */}
            <InterceptorProvider>
              <AuthProvider>
                <AlertProvider>
                  {/* Inicializar interceptores con Context API */}
                  <InterceptorsInitializer />
                  
                  {/* UI Global: Barra de loading superior (menos intrusiva) */}
                  <GlobalLoadingBar />
                  
                  {/* UI Global: Alert dialog para errores críticos */}
                  <GlobalAlertDialog />
                  
                  {/* Tu aplicación */}
                  {children}
                </AlertProvider>
              </AuthProvider>
            </InterceptorProvider>
          </Suspense>
          
          {/* Toast notifications */}
          <Toaster position="top-right" richColors closeButton />
          
          {/* Analytics */}
          <Analytics />
        </Theme>
      </body>
    </html>
  )
}
