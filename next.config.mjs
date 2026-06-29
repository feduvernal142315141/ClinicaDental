/** @type {import('next').NextConfig} */
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
}

export default nextConfig
