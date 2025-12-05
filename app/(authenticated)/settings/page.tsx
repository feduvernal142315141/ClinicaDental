"use client";

import dynamic from "next/dynamic";
import { LazyLoadingFallback } from "@/components/ui/atomic/feedback/lazy-loading-fallback";

const SettingsPage = dynamic(
  () =>
    import("@/components/settings/settings-page").then(
      (mod) => mod.SettingsPage
    ),
  { loading: () => <LazyLoadingFallback /> }
);

export default function SettingsRoute() {
  return <SettingsPage />;
}
