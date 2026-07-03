/**
 * calculateAge — calcula años y meses de edad a partir de una fecha en formato
 * 'YYYY-MM-DD' o cadena ISO. Devuelve { years: 0, months: 0 } para entrada
 * inválida o vacía; NUNCA lanza excepción.
 */
export function calculateAge(dateOfBirth: string | null | undefined): {
  years: number;
  months: number;
} {
  if (!dateOfBirth) return { years: 0, months: 0 };

  // Normalizar: 'YYYY-MM-DD' → agregar 'T00:00' para que sea hora local
  const normalized = dateOfBirth.includes("T")
    ? dateOfBirth
    : `${dateOfBirth}T00:00`;

  const birthDate = new Date(normalized);

  if (Number.isNaN(birthDate.getTime())) return { years: 0, months: 0 };

  const today = new Date();

  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();

  // Ajustar si el mes/día aún no ha llegado este año
  if (today.getDate() < birthDate.getDate()) {
    months -= 1;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  // Protección: nunca devolver valores negativos (fechas futuras)
  if (years < 0) return { years: 0, months: 0 };

  return { years, months };
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return "";
  const normalized = date.includes("T") ? date : `${date}T00:00`;
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-ES", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}
