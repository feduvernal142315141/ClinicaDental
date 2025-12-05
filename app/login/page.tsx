import { LoginForm } from "@/components/auth/login-form";

/**
 * LOGIN PAGE (SERVER COMPONENT)
 *
 * Server Component para la página de login
 * LoginForm ya es un Client Component, no necesita wrapper adicional
 */
export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <LoginForm />
    </div>
  );
}
