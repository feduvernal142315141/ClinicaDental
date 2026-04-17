"use client";

import {
  Carousel,
  CarouselItem,
} from "@/components/ui/atomic/data-display/carousel";

const clinicImages = [
  {
    id: 1,
    url: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Clinica-Dental-confianza-murcia.jpg-s1w6bYmCBLzxnTkRAnaJzziFKIGOrc.jpeg",
    alt: "Paciente sonriente durante tratamiento dental",
  },
  {
    id: 2,
    url: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Clinica-dadent-home-6Da9GEZzPPhzhVGgwWhRWK1sg8SZT7.webp",
    alt: "Equipo médico profesional en consultorio moderno",
  },
  {
    id: 3,
    url: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/tu-dentista-en-madrid-kQZyaTr9YvSz783GdYfuaG9HOS0oSD.webp",
    alt: "Atención dental profesional y confiable",
  },
];

export function LoginHeroSection() {
  const carouselItems: CarouselItem[] = clinicImages.map((image) => ({
    id: image.id,
    content: (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={image.url || "/placeholder.svg"}
        alt={image.alt}
        className="w-full h-full object-cover transition-opacity duration-1000"
      />
    ),
  }));

  const overlay = (
    <>
      {/* Gradiente */}
      <div className="absolute inset-0 bg-linear-to-br from-medical-primary/20 to-medical-secondary/20" />

      {/* Texto descriptivo */}
      <div className="absolute inset-0 flex flex-col justify-end p-12">
        <div className="bg-black/60 backdrop-blur-sm rounded-lg p-6">
          <h1 className="text-4xl font-bold mb-4 text-white">
            Sistema de Gestión Médica
          </h1>
          <p className="text-xl text-white mb-2">
            Tecnología avanzada para el cuidado dental
          </p>
          <p className="text-lg text-white/90">
            Gestiona citas, pacientes y tratamientos de forma eficiente
          </p>
        </div>
      </div>
    </>
  );

  return (
    <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
      <Carousel
        items={carouselItems}
        autoPlayInterval={5000}
        showControls
        showIndicators
        overlay={overlay}
        className="w-full h-full"
      />
    </div>
  );
}
