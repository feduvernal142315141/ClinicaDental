import { ResetPasswordForm } from "@/components/features/auth/reset-password-form";
import { LoginHeroSection } from "@/components/features/auth/login-hero-section";

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex">
      <LoginHeroSection />

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gradient-to-br from-slate-50 to-white">
        <ResetPasswordForm />
      </div>
    </div>
  );
}
