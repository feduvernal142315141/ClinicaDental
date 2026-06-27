import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAMES } from "@/lib/auth/cookies";

export default async function HomePage() {
  // Sesión JWT (OTP): basta la presencia del token en cookie, igual que el
  // middleware. La validez se verifica en cada request del backend.
  const cookieStore = await cookies();
  const accessToken =
    cookieStore.get(AUTH_COOKIE_NAMES.accessToken)?.value ??
    cookieStore.get("loggedUser")?.value;

  redirect(accessToken ? "/dashboard" : "/login");
}
