"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const GeneralSettings = dynamic(
  () =>
    import("@/components/features/settings/general-settings").then(
      (mod) => mod.GeneralSettings,
    ),
  {
    loading: () => (
      <div className="flex h-64 items-center justify-center gap-2 text-subtle">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Cargando…</span>
      </div>
    ),
  },
);

export default function GeneralSettingsPage() {
  return <GeneralSettings />;
}
