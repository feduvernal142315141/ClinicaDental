/** @type {import('next').NextConfig} */

// ── Content-Security-Policy ───────────────────────────────────────────────────
// Se emite en modo REPORT-ONLY a propósito: la app usa estilos inline + CSS-in-JS
// de Ant Design, scripts externos (Vercel Analytics) y en local llama al API por
// http://localhost. Una CSP *enforcing* sin afinar rompería esos casos y el dev.
// Report-Only reporta violaciones sin bloquear. Para promoverla a enforcing:
// (1) acotar orígenes reales, (2) migrar a nonces por request vía middleware,
// (3) cambiar la cabecera a `Content-Security-Policy`.
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https: https://res.cloudinary.com",
  "font-src 'self' data:",
  "connect-src 'self' https: http://localhost:* ws: wss: https://api.cloudinary.com",
  "frame-src 'self'",
].join("; ");

// Cabeceras de seguridad HTTP (enforcing salvo la CSP). `microphone=(self)` se
// permite porque la app usa dictado por voz; cámara y geolocalización se bloquean.
const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self)" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Content-Security-Policy-Report-Only", value: contentSecurityPolicy },
];

const nextConfig = {
  // Aísla la salida del build de producción del `.next` que usa `next dev`.
  // `yarn build` escribe en `.next-build` (NEXT_DIST_DIR) y NUNCA corrompe el
  // servidor de desarrollo → el HMR deja de romperse al compilar (no más
  // reinicios). `yarn dev` usa el `.next` por defecto.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Aplica las cabeceras de seguridad a todas las rutas.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
}

export default nextConfig
