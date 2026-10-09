import type { DocumentBlock } from ".";

export const DOCUMENT_VARIABLES = [
  { key: "paciente.nombre", group: "patient", label: "patientName" },
  { key: "paciente.identificacion", group: "patient", label: "patientIdentificationNumber" },
  { key: "paciente.correo", group: "patient", label: "patientEmail" },
  { key: "paciente.telefono", group: "patient", label: "patientPhone" },
  { key: "paciente.fecha_nacimiento", group: "patient", label: "patientBirthDate" },
  { key: "paciente.genero", group: "patient", label: "patientGender" },
  { key: "paciente.direccion", group: "patient", label: "patientAddress" },
  { key: "doctor.nombre", group: "doctor", label: "doctorName" },
  { key: "doctor.licencia", group: "doctor", label: "doctorLicense" },
  { key: "doctor.especialidad", group: "doctor", label: "doctorSpecialty" },
  { key: "tratamiento", group: "otherVariables", label: "treatment" },
  { key: "observaciones", group: "otherVariables", label: "observations" },
  { key: "fecha_documento", group: "otherVariables", label: "currentDate" },
] as const;
export const DOCUMENT_DATE_FORMATS = [
  { value: "DMY_SLASH", example: "31/12/2026" },
  { value: "DMY_DASH", example: "31-12-2026" },
  { value: "MDY_SLASH", example: "12/31/2026" },
  { value: "YMD_DASH", example: "2026-12-31" },
  { value: "DMY_DOT", example: "31.12.2026" },
] as const;
export function isConfiguredDocumentDate(key: string): boolean {
  const [name, source, format, extra] = key.split(":");
  return extra === undefined && name === "fecha_documento" && ["actual", "seleccionada"].includes(source) && DOCUMENT_DATE_FORMATS.some(item => item.value === format);
}
export function observationTitle(key: string): string | null {
  if (!key.startsWith("observaciones:")) return null;
  const title = key.slice("observaciones:".length);
  return !title || title !== title.trim() || title.length > 100 || [...title].some(char => { const code = char.charCodeAt(0); return code < 32 || (code >= 127 && code <= 159) || char === '{' || char === '}'; }) ? null : title;
}
export function documentObservationTitles(blocks: DocumentBlock[]): string[] {
  const titles = new Set<string>();
  for (const block of blocks) {
    if (block.type !== "TEXT") continue;
    for (const token of (block.text ?? "").matchAll(/\{\{([^{}]*)}}/g)) {
      const title = observationTitle(token[1].trim());
      if (title) titles.add(title);
    }
  }
  return [...titles];
}
export function validDocumentVariables(text: string): boolean {
  const tokens = [...text.matchAll(/\{\{([^{}]*)}}/g)];
  const remainder = text.replace(/\{\{([^{}]*)}}/g, "");
  return !remainder.includes("{{") && !remainder.includes("}}") && tokens.every(token => (DOCUMENT_VARIABLES.some(variable => variable.key !== "observaciones" && variable.key === token[1].trim()) || ["fecha_actual", "fecha_documento:actual", "fecha_documento:seleccionada"].includes(token[1].trim()) || isConfiguredDocumentDate(token[1].trim()) || observationTitle(token[1].trim()) !== null));
}
export function needsDoctorVariables(blocks: DocumentBlock[]): boolean {
  return blocks.some(block => block.type === "TEXT" && [...(block.text ?? "").matchAll(/\{\{([^{}]*)}}/g)].some(token => DOCUMENT_VARIABLES.some(variable => variable.group === "doctor" && variable.key === token[1].trim())));
}

export function needsSelectedDocumentDate(blocks: DocumentBlock[]): boolean {
  return blocks.some(block => block.type === "TEXT" && [...(block.text ?? "").matchAll(/\{\{([^{}]*)}}/g)].some(token => (token[1].trim() === "fecha_documento:seleccionada" || (isConfiguredDocumentDate(token[1].trim()) && token[1].trim().split(":")[1] === "seleccionada"))));
}
