/**
 * Auth Components Module
 *
 * Barrel export del módulo de autenticación.
 * Consumir vía `@/components/features/auth`.
 */

// Shared (2026: shell con partículas + tarjeta glass bento + campos flotantes)
export { AuthShell } from "./components/auth-shell";
export { AuthCard } from "./components/auth-card";
export { AuthParticles } from "./components/auth-particles";
export { FloatingField } from "./components/floating-field";
export { PasswordStrength } from "./components/password-strength";

// Login
export { LoginForm } from "./login/login-form";

// Flujos
export { ForgotPasswordForm } from "./forgot-password/forgot-password-form";
export { ResetPasswordForm } from "./reste-password/reset-password-form";
export { ValidateOtpForm } from "./validate-otp/validate-otp-form";
