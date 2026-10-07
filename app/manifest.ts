import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ClinicFlow360",
    short_name: "ClinicFlow360",
    description: "Gestión de clínicas dentales: agenda, pacientes, odontograma e historia clínica.",
    start_url: "/",
    display: "standalone",
    background_color: "#072b46",
    theme_color: "#037ecc",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
