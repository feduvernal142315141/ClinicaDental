"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function EditAppointmentPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/appointments?notice=edit_unavailable");
  }, [router]);

  return null;
}
