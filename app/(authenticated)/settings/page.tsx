"use client";

import { redirect } from "next/navigation";

// Redirect to general settings by default
export default function SettingsRoute() {
  redirect("/settings/general");
}
