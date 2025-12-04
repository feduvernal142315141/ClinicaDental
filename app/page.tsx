import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Middleware handles the redirect, but this is a fallback
  if (session) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}
