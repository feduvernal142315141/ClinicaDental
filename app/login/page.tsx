import { LoginForm } from "@/components/features/auth";

/**
 * LOGIN PAGE (SERVER COMPONENT)
 *
 * Server Component para la página de login
 * LoginForm ya es un Client Component, no necesita wrapper adicional
 */
export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background">
      <LoginForm />
    </div>
  );
}
