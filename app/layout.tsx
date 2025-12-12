import type React from "react";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "@radix-ui/themes/styles.css";
import "./globals.css";
import { RootClient } from "@/components/layout/root-client";

export const metadata: Metadata = {
  title: "Sistema Médico Dental",
  description: "Created by Kode Wave Solutions S.A",
  generator: "v1.0.0",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} font-sans`}
        suppressHydrationWarning
      >
        <RootClient>{children}</RootClient>
      </body>
    </html>
  );
}
