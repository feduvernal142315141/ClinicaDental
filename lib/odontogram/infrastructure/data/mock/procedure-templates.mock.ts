import type { ProcedureTemplate } from "@/lib/odontogram/domain/odontogram/types"

export const PROCEDURE_TEMPLATES_MOCK: ProcedureTemplate[] = [
  {
    id: "endo-corona",
    name: "Endo + Núcleo + Corona",
    description: "Tratamiento completo de endodoncia con rehabilitación protésica",
    procedures: [
      { procedureId: "endo-unirradicular", order: 1 },
      { procedureId: "nucleo", order: 2, dependsOn: ["endo-unirradicular"] },
      { procedureId: "corona-metal-ceramica", order: 3, dependsOn: ["nucleo"] },
    ],
  },
  {
    id: "implante-completo",
    name: "Implante Completo",
    description: "Cirugía de implante + prótesis sobre implante",
    procedures: [
      { procedureId: "implante-cirugia", order: 1 },
      { procedureId: "implante-protesis", order: 2, dependsOn: ["implante-cirugia"] },
    ],
  },
]
