/**
 * Routes Constants
 *
 * Centralized configuration for public and private routes
 */

/**
 * Public routes that don't require authentication
 * These routes will render without the app shell (sidebar/header)
 */
export const PUBLIC_ROUTES = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/validate-otp",
] as const;

/**
 * Auth routes that should redirect to dashboard if user is already authenticated
 */
export const AUTH_ROUTES = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/validate-otp",
] as const;

/**
 * Protected routes that require authentication
 * Base paths for main application sections
 */
export const PROTECTED_ROUTES = [
  "/dashboard",
  "/patients",
  "/appointments",
  "/campaigns",
  "/settings",
  "/support",
  "/template-demo",
] as const;

/**
 * Default redirect path after successful login
 */
export const DEFAULT_LOGIN_REDIRECT = "/dashboard";

/**
 * Default redirect path after logout
 */
export const DEFAULT_LOGOUT_REDIRECT = "/login";

/**
 * Check if a path is a public route
 */
export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
}

/**
 * Check if a path is an auth route
 */
export function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some((route) => pathname.startsWith(route));
}

/**
 * Check if a path is a protected route
 */
export function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
}
