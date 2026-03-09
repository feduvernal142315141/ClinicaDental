import type { TreatmentCategory } from "@/lib/odontogram/domain/odontogram/types"

export const TREATMENT_CATALOG_MOCK: TreatmentCategory[] = [
  {
    name: "Obturación Composite",
    treatments: [
      { name: "Simple", price: 120, surfaces: ["mesial", "distal", "facial", "lingual", "oclusal"] },
      { name: "Compleja", price: 150, surfaces: ["mesial", "distal", "facial", "lingual", "oclusal"] },
      { name: "Gran Reconstrucción", price: 180, surfaces: ["mesial", "distal", "facial", "lingual", "oclusal"] },
      { name: "In-Lay", price: 100 },
      { name: "On-Lay", price: 100 },
    ],
  },
  {
    name: "Endodoncia",
    treatments: [
      { name: "Unirradicular", price: 200 },
      { name: "Birradicular", price: 280 },
      { name: "Multirradicular", price: 350 },
    ],
  },
  {
    name: "Prótesis",
    treatments: [
      { name: "Corona Metal-Cerámica", price: 400 },
      { name: "Corona Zirconio", price: 550 },
      { name: "Implante", price: 1200 },
      { name: "Puente 3 Piezas", price: 1100 },
    ],
  },
  {
    name: "Periodoncia",
    treatments: [
      { name: "Limpieza Básica", price: 60 },
      { name: "Curetaje por Cuadrante", price: 120 },
      { name: "Cirugía Periodontal", price: 300 },
    ],
  },
  {
    name: "Cirugía",
    treatments: [
      { name: "Extracción Simple", price: 80 },
      { name: "Extracción Compleja", price: 150 },
      { name: "Extracción Cordal", price: 180 },
    ],
  },
  {
    name: "Estética",
    treatments: [
      { name: "Blanqueamiento", price: 250 },
      { name: "Carilla Composite", price: 200 },
      { name: "Carilla Porcelana", price: 450 },
    ],
  },
]
