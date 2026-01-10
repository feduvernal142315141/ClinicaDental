"use client";

import { useLoginForm } from "@/lib/hooks/use-login-form";
import { LoginHeroSection } from "./login-hero-section";
import { LoginFormCard } from "./login-form-card";

export function LoginForm() {
  const {
    email,
    setEmail,
    password,
    setPassword,
    loading,
    authError,
    handleSubmit,
  } = useLoginForm();

  return (
    <div className="min-h-screen flex">
      {/* Hero section con carousel */}
      <LoginHeroSection />

      {/* Formulario de login */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gradient-to-br from-slate-50 to-white">
        <LoginFormCard
          email={email}
          password={password}
          loading={loading}
          authError={authError}
          onEmailChange={setEmail}
          onPasswordChange={setPassword}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
