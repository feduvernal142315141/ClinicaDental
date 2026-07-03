/**
 * Subconjunto curatorado de códigos CIE-10 de relevancia odontológica.
 *
 * Grupos cubiertos: K00-K14 (dientes, pulpa, periodonto, mucosa, maxilares)
 * y códigos Z comunes en odontología preventiva/examen.
 * Etiquetas en español (terminología OPS/OMS).
 */

import type { VisitDiagnosis } from "./index";

// ---------------------------------------------------------------------------
// Tipo del catálogo
// ---------------------------------------------------------------------------

export interface Cie10DentalCode {
  code: string;
  /** Descripción en español según OPS/CIE-10. */
  label: string;
  /** Grupo temático para agrupar en UI. */
  group: string;
}

// ---------------------------------------------------------------------------
// Catálogo (~200 códigos curados)
// ---------------------------------------------------------------------------

export const CIE10_DENTAL_CODES: Cie10DentalCode[] = [
  // ── K00 Desarrollo y erupción ──────────────────────────────────────────
  { code: "K00.0", label: "Anodoncia", group: "Desarrollo y erupción" },
  { code: "K00.1", label: "Dientes supernumerarios", group: "Desarrollo y erupción" },
  { code: "K00.2", label: "Anomalías del tamaño y forma del diente", group: "Desarrollo y erupción" },
  { code: "K00.3", label: "Dientes moteados (fluorosis dental)", group: "Desarrollo y erupción" },
  { code: "K00.4", label: "Trastornos de la formación dentaria", group: "Desarrollo y erupción" },
  { code: "K00.5", label: "Trastornos hereditarios de la estructura dentaria", group: "Desarrollo y erupción" },
  { code: "K00.6", label: "Trastornos de la erupción dentaria", group: "Desarrollo y erupción" },
  { code: "K00.7", label: "Síndrome de erupción dentaria", group: "Desarrollo y erupción" },
  { code: "K00.8", label: "Otros trastornos del desarrollo de los dientes", group: "Desarrollo y erupción" },
  { code: "K00.9", label: "Trastorno del desarrollo dentario, no especificado", group: "Desarrollo y erupción" },

  // ── K01 Dientes incluidos ──────────────────────────────────────────────
  { code: "K01.0", label: "Dientes incluidos", group: "Dientes incluidos" },
  { code: "K01.1", label: "Dientes impactados", group: "Dientes incluidos" },

  // ── K02 Caries dental ─────────────────────────────────────────────────
  { code: "K02.0", label: "Caries limitada al esmalte", group: "Caries dental" },
  { code: "K02.1", label: "Caries de la dentina", group: "Caries dental" },
  { code: "K02.2", label: "Caries del cemento", group: "Caries dental" },
  { code: "K02.3", label: "Caries dentaria detenida", group: "Caries dental" },
  { code: "K02.4", label: "Odontoclasia", group: "Caries dental" },
  { code: "K02.5", label: "Caries dental con exposición pulpar", group: "Caries dental" },
  { code: "K02.8", label: "Otras caries dentales", group: "Caries dental" },
  { code: "K02.9", label: "Caries dental, no especificada", group: "Caries dental" },

  // ── K03 Tejidos duros ─────────────────────────────────────────────────
  { code: "K03.0", label: "Desgaste excesivo de los dientes (atricción)", group: "Tejidos duros" },
  { code: "K03.1", label: "Abrasión de los dientes", group: "Tejidos duros" },
  { code: "K03.2", label: "Erosión de los dientes", group: "Tejidos duros" },
  { code: "K03.3", label: "Resorción patológica de los dientes", group: "Tejidos duros" },
  { code: "K03.4", label: "Hipercementosis", group: "Tejidos duros" },
  { code: "K03.5", label: "Anquilosis dental", group: "Tejidos duros" },
  { code: "K03.6", label: "Depósitos (cálculo) en los dientes", group: "Tejidos duros" },
  { code: "K03.7", label: "Cambios de color posteruptivos de los tejidos duros", group: "Tejidos duros" },
  { code: "K03.8", label: "Otras enfermedades de los tejidos duros dentales", group: "Tejidos duros" },
  { code: "K03.9", label: "Enfermedad de los tejidos duros, no especificada", group: "Tejidos duros" },

  // ── K04 Pulpa y tejidos periapicales ──────────────────────────────────
  { code: "K04.0", label: "Pulpitis", group: "Pulpa y periápice" },
  { code: "K04.01", label: "Pulpitis reversible", group: "Pulpa y periápice" },
  { code: "K04.02", label: "Pulpitis irreversible", group: "Pulpa y periápice" },
  { code: "K04.1", label: "Necrosis de la pulpa", group: "Pulpa y periápice" },
  { code: "K04.2", label: "Degeneración de la pulpa", group: "Pulpa y periápice" },
  { code: "K04.3", label: "Formación anómala de tejido duro en la pulpa", group: "Pulpa y periápice" },
  { code: "K04.4", label: "Periodontitis apical aguda originada en la pulpa", group: "Pulpa y periápice" },
  { code: "K04.5", label: "Periodontitis apical crónica", group: "Pulpa y periápice" },
  { code: "K04.6", label: "Absceso periapical con fístula", group: "Pulpa y periápice" },
  { code: "K04.60", label: "Absceso periapical con fístula al seno maxilar", group: "Pulpa y periápice" },
  { code: "K04.61", label: "Absceso periapical con fístula a la fosa nasal", group: "Pulpa y periápice" },
  { code: "K04.62", label: "Absceso periapical con fístula a la cavidad bucal", group: "Pulpa y periápice" },
  { code: "K04.63", label: "Absceso periapical con fístula hacia la piel", group: "Pulpa y periápice" },
  { code: "K04.69", label: "Absceso periapical con fístula, no especificado", group: "Pulpa y periápice" },
  { code: "K04.7", label: "Absceso periapical sin fístula", group: "Pulpa y periápice" },
  { code: "K04.8", label: "Quiste radicular", group: "Pulpa y periápice" },
  { code: "K04.80", label: "Quiste apical y lateral", group: "Pulpa y periápice" },
  { code: "K04.81", label: "Quiste residual", group: "Pulpa y periápice" },
  { code: "K04.82", label: "Quiste periodontal inflamatorio", group: "Pulpa y periápice" },
  { code: "K04.89", label: "Quiste radicular, no especificado", group: "Pulpa y periápice" },
  { code: "K04.9", label: "Otras enfermedades de la pulpa y tejidos periapicales", group: "Pulpa y periápice" },

  // ── K05 Gingivitis y enfermedades periodontales ────────────────────────
  { code: "K05.0", label: "Gingivitis aguda", group: "Periodontal" },
  { code: "K05.00", label: "Gingivitis aguda, placa bacteriana", group: "Periodontal" },
  { code: "K05.01", label: "Gingivitis aguda, otro origen", group: "Periodontal" },
  { code: "K05.1", label: "Gingivitis crónica", group: "Periodontal" },
  { code: "K05.10", label: "Gingivitis marginal simple crónica", group: "Periodontal" },
  { code: "K05.11", label: "Hiperplasia gingival", group: "Periodontal" },
  { code: "K05.19", label: "Gingivitis crónica, no especificada", group: "Periodontal" },
  { code: "K05.2", label: "Periodontitis aguda", group: "Periodontal" },
  { code: "K05.20", label: "Absceso periodontal", group: "Periodontal" },
  { code: "K05.21", label: "Periodontitis apical aguda", group: "Periodontal" },
  { code: "K05.22", label: "Pericoronaritis", group: "Periodontal" },
  { code: "K05.29", label: "Periodontitis aguda, no especificada", group: "Periodontal" },
  { code: "K05.3", label: "Periodontitis crónica", group: "Periodontal" },
  { code: "K05.30", label: "Periodontitis crónica generalizada", group: "Periodontal" },
  { code: "K05.31", label: "Periodontitis crónica localizada", group: "Periodontal" },
  { code: "K05.4", label: "Periodontosis", group: "Periodontal" },
  { code: "K05.5", label: "Otras enfermedades periodontales", group: "Periodontal" },
  { code: "K05.6", label: "Enfermedad periodontal, no especificada", group: "Periodontal" },

  // ── K06 Encías y reborde alveolar ─────────────────────────────────────
  { code: "K06.0", label: "Recesión gingival", group: "Encías y reborde alveolar" },
  { code: "K06.01", label: "Recesión gingival localizada", group: "Encías y reborde alveolar" },
  { code: "K06.02", label: "Recesión gingival generalizada", group: "Encías y reborde alveolar" },
  { code: "K06.1", label: "Agrandamiento gingival", group: "Encías y reborde alveolar" },
  { code: "K06.2", label: "Lesiones gingivales y del reborde alveolar edéntulo", group: "Encías y reborde alveolar" },
  { code: "K06.3", label: "Épulis", group: "Encías y reborde alveolar" },
  { code: "K06.8", label: "Otros trastornos de las encías y del reborde alveolar", group: "Encías y reborde alveolar" },
  { code: "K06.9", label: "Trastorno de las encías, no especificado", group: "Encías y reborde alveolar" },

  // ── K07 Anomalías dentofaciales ───────────────────────────────────────
  { code: "K07.0", label: "Anomalías importantes del tamaño de los maxilares", group: "Anomalías dentofaciales" },
  { code: "K07.1", label: "Anomalías de la relación maxilar-base craneal", group: "Anomalías dentofaciales" },
  { code: "K07.2", label: "Anomalías de la relación entre arcos dentarios", group: "Anomalías dentofaciales" },
  { code: "K07.20", label: "Resalte horizontal (overjet) excesivo", group: "Anomalías dentofaciales" },
  { code: "K07.21", label: "Sobremordida vertical excesiva", group: "Anomalías dentofaciales" },
  { code: "K07.22", label: "Mordida abierta", group: "Anomalías dentofaciales" },
  { code: "K07.23", label: "Mordida cruzada", group: "Anomalías dentofaciales" },
  { code: "K07.24", label: "Desplazamiento de segmentos del arco dental", group: "Anomalías dentofaciales" },
  { code: "K07.25", label: "Mordida profunda inversa", group: "Anomalías dentofaciales" },
  { code: "K07.29", label: "Anomalía de la relación del arco dental, NE", group: "Anomalías dentofaciales" },
  { code: "K07.3", label: "Anomalías en la posición del diente", group: "Anomalías dentofaciales" },
  { code: "K07.30", label: "Apiñamiento dental", group: "Anomalías dentofaciales" },
  { code: "K07.31", label: "Desplazamiento del diente", group: "Anomalías dentofaciales" },
  { code: "K07.32", label: "Rotación del diente", group: "Anomalías dentofaciales" },
  { code: "K07.33", label: "Espaciado anormal de los dientes", group: "Anomalías dentofaciales" },
  { code: "K07.34", label: "Transposición dental", group: "Anomalías dentofaciales" },
  { code: "K07.35", label: "Diente retenido o impactado (maloclusión)", group: "Anomalías dentofaciales" },
  { code: "K07.39", label: "Anomalía de posición dental, no especificada", group: "Anomalías dentofaciales" },
  { code: "K07.4", label: "Maloclusión, no especificada", group: "Anomalías dentofaciales" },
  { code: "K07.5", label: "Anomalías dentofaciales funcionales", group: "Anomalías dentofaciales" },
  { code: "K07.6", label: "Trastornos de la articulación temporomandibular", group: "Anomalías dentofaciales" },
  { code: "K07.60", label: "Síndrome de la articulación temporomandibular", group: "Anomalías dentofaciales" },
  { code: "K07.61", label: "Chasquido de la articulación temporomandibular", group: "Anomalías dentofaciales" },
  { code: "K07.62", label: "Artralgia de la articulación temporomandibular", group: "Anomalías dentofaciales" },
  { code: "K07.63", label: "Luxación de la articulación temporomandibular", group: "Anomalías dentofaciales" },
  { code: "K07.69", label: "Otros trastornos de la ATM", group: "Anomalías dentofaciales" },
  { code: "K07.8", label: "Otras anomalías dentofaciales", group: "Anomalías dentofaciales" },
  { code: "K07.9", label: "Anomalía dentofacial, no especificada", group: "Anomalías dentofaciales" },

  // ── K08 Soporte dental ────────────────────────────────────────────────
  { code: "K08.0", label: "Exfoliación de los dientes por causas sistémicas", group: "Soporte dental" },
  { code: "K08.1", label: "Pérdida de dientes por accidente, extracción o enfermedad", group: "Soporte dental" },
  { code: "K08.10", label: "Pérdida de dientes, sin especificación de causa", group: "Soporte dental" },
  { code: "K08.11", label: "Pérdida de dientes por caries", group: "Soporte dental" },
  { code: "K08.12", label: "Pérdida de dientes por enfermedad periodontal", group: "Soporte dental" },
  { code: "K08.13", label: "Pérdida de dientes por traumatismo", group: "Soporte dental" },
  { code: "K08.19", label: "Pérdida de dientes por otra causa", group: "Soporte dental" },
  { code: "K08.2", label: "Atrofia del reborde alveolar edéntulo", group: "Soporte dental" },
  { code: "K08.3", label: "Raíz dental retenida", group: "Soporte dental" },
  { code: "K08.4", label: "Trastornos dentales por otros factores", group: "Soporte dental" },
  { code: "K08.5", label: "Desgaste dental por causas diversas", group: "Soporte dental" },
  { code: "K08.50", label: "Desgaste dental, sin especificación", group: "Soporte dental" },
  { code: "K08.51", label: "Desgaste dental mínimo", group: "Soporte dental" },
  { code: "K08.52", label: "Desgaste dental moderado", group: "Soporte dental" },
  { code: "K08.53", label: "Desgaste dental severo", group: "Soporte dental" },
  { code: "K08.8", label: "Otros trastornos de los dientes y estructuras de sostén", group: "Soporte dental" },
  { code: "K08.81", label: "Necrosis del hueso alveolar inferior", group: "Soporte dental" },
  { code: "K08.89", label: "Otros trastornos especificados de los dientes", group: "Soporte dental" },
  { code: "K08.9", label: "Trastorno de los dientes y estructuras de sostén, NE", group: "Soporte dental" },

  // ── K09 Quistes de la región oral ─────────────────────────────────────
  { code: "K09.0", label: "Quistes originados por el desarrollo dental", group: "Quistes" },
  { code: "K09.1", label: "Quistes gingivales en adultos", group: "Quistes" },
  { code: "K09.2", label: "Otros quistes de los maxilares", group: "Quistes" },
  { code: "K09.8", label: "Otros quistes de la región oral", group: "Quistes" },
  { code: "K09.9", label: "Quiste de la región oral, no especificado", group: "Quistes" },

  // ── K10 Enfermedades de los maxilares ────────────────────────────────
  { code: "K10.0", label: "Trastornos del desarrollo de los maxilares", group: "Maxilares" },
  { code: "K10.1", label: "Granuloma central de células gigantes", group: "Maxilares" },
  { code: "K10.2", label: "Afecciones inflamatorias de los maxilares", group: "Maxilares" },
  { code: "K10.20", label: "Osteítis de los maxilares", group: "Maxilares" },
  { code: "K10.21", label: "Osteomielitis del maxilar", group: "Maxilares" },
  { code: "K10.22", label: "Periostitis de los maxilares", group: "Maxilares" },
  { code: "K10.23", label: "Osteorradionecrosis del maxilar", group: "Maxilares" },
  { code: "K10.3", label: "Alveolitis del maxilar (alveolitis seca)", group: "Maxilares" },
  { code: "K10.8", label: "Otras enfermedades especificadas de los maxilares", group: "Maxilares" },
  { code: "K10.9", label: "Enfermedad de los maxilares, no especificada", group: "Maxilares" },

  // ── K11 Glándulas salivales ───────────────────────────────────────────
  { code: "K11.0", label: "Atrofia de la glándula salival", group: "Glándulas salivales" },
  { code: "K11.1", label: "Hipertrofia de la glándula salival", group: "Glándulas salivales" },
  { code: "K11.2", label: "Sialoadenitis", group: "Glándulas salivales" },
  { code: "K11.3", label: "Absceso de la glándula salival", group: "Glándulas salivales" },
  { code: "K11.4", label: "Fístula de la glándula salival", group: "Glándulas salivales" },
  { code: "K11.5", label: "Sialolitiasis (cálculo salival)", group: "Glándulas salivales" },
  { code: "K11.6", label: "Mucocele de la glándula salival", group: "Glándulas salivales" },
  { code: "K11.7", label: "Alteraciones de la secreción salival", group: "Glándulas salivales" },
  { code: "K11.70", label: "Hiposecreción salival", group: "Glándulas salivales" },
  { code: "K11.71", label: "Xerostomía", group: "Glándulas salivales" },
  { code: "K11.79", label: "Otras alteraciones de la secreción salival", group: "Glándulas salivales" },
  { code: "K11.8", label: "Otras enfermedades de las glándulas salivales", group: "Glándulas salivales" },
  { code: "K11.9", label: "Enfermedad de la glándula salival, no especificada", group: "Glándulas salivales" },

  // ── K12 Estomatitis ───────────────────────────────────────────────────
  { code: "K12.0", label: "Aftas bucales recurrentes", group: "Estomatitis y mucosa" },
  { code: "K12.1", label: "Otras formas de estomatitis", group: "Estomatitis y mucosa" },
  { code: "K12.10", label: "Estomatitis protésica", group: "Estomatitis y mucosa" },
  { code: "K12.19", label: "Otras estomatitis", group: "Estomatitis y mucosa" },
  { code: "K12.2", label: "Celulitis y absceso del piso de la boca", group: "Estomatitis y mucosa" },
  { code: "K12.3", label: "Mucositis bucal (ulcerativa)", group: "Estomatitis y mucosa" },

  // ── K13 Labios y mucosa bucal ─────────────────────────────────────────
  { code: "K13.0", label: "Enfermedades de los labios", group: "Estomatitis y mucosa" },
  { code: "K13.1", label: "Mordedura del labio y de la mejilla", group: "Estomatitis y mucosa" },
  { code: "K13.2", label: "Leucoplasia y otras perturbaciones del epitelio bucal", group: "Estomatitis y mucosa" },
  { code: "K13.20", label: "Leucoplasia oral", group: "Estomatitis y mucosa" },
  { code: "K13.21", label: "Eritroplasia oral", group: "Estomatitis y mucosa" },
  { code: "K13.22", label: "Fibrosis submucosa bucal", group: "Estomatitis y mucosa" },
  { code: "K13.23", label: "Leucoqueratosis nicotínica del paladar", group: "Estomatitis y mucosa" },
  { code: "K13.29", label: "Otras perturbaciones del epitelio bucal", group: "Estomatitis y mucosa" },
  { code: "K13.3", label: "Leucoplasia pilosa", group: "Estomatitis y mucosa" },
  { code: "K13.4", label: "Lesiones granulares e inflamatorias de la mucosa bucal", group: "Estomatitis y mucosa" },
  { code: "K13.5", label: "Fibrosis de la mucosa bucal", group: "Estomatitis y mucosa" },
  { code: "K13.6", label: "Hiperplasia irritativa de la mucosa bucal", group: "Estomatitis y mucosa" },
  { code: "K13.7", label: "Otras lesiones de la mucosa bucal", group: "Estomatitis y mucosa" },
  { code: "K13.70", label: "Condición oral no especificada", group: "Estomatitis y mucosa" },
  { code: "K13.79", label: "Otras lesiones especificadas de la mucosa bucal", group: "Estomatitis y mucosa" },

  // ── K14 Enfermedades de la lengua ─────────────────────────────────────
  { code: "K14.0", label: "Glositis", group: "Lengua" },
  { code: "K14.1", label: "Lengua geográfica", group: "Lengua" },
  { code: "K14.2", label: "Glositis romboidal mediana", group: "Lengua" },
  { code: "K14.3", label: "Hipertrofia de las papilas linguales", group: "Lengua" },
  { code: "K14.4", label: "Atrofia de las papilas linguales", group: "Lengua" },
  { code: "K14.5", label: "Lengua plegada (fisurada)", group: "Lengua" },
  { code: "K14.6", label: "Glosodinia (lengua urente)", group: "Lengua" },
  { code: "K14.8", label: "Otras enfermedades de la lengua", group: "Lengua" },
  { code: "K14.9", label: "Enfermedad de la lengua, no especificada", group: "Lengua" },

  // ── Z — Prevención y examen odontológico ──────────────────────────────
  { code: "Z01.20", label: "Examen dental, sin especificación", group: "Prevención y examen" },
  { code: "Z01.21", label: "Examen dental con hallazgos patológicos", group: "Prevención y examen" },
  { code: "Z01.29", label: "Examen dental, otro especificado", group: "Prevención y examen" },
  { code: "Z29.8", label: "Otros procedimientos profilácticos especificados", group: "Prevención y examen" },
  { code: "Z46.3", label: "Fijación de prótesis dental", group: "Prevención y examen" },
  { code: "Z46.4", label: "Fijación de aparato de ortodoncia", group: "Prevención y examen" },
  { code: "Z71.89", label: "Asesoramiento/educación dental", group: "Prevención y examen" },
  { code: "Z98.811", label: "Extracción dental en la historia clínica", group: "Prevención y examen" },
];

// ---------------------------------------------------------------------------
// Búsqueda
// ---------------------------------------------------------------------------

/**
 * Busca en el catálogo CIE-10 dental por código o por término en español.
 * Devuelve hasta 50 resultados ordenados por relevancia (coincidencia exacta en
 * código primero, luego coincidencia al inicio del label, luego cualquier match).
 *
 * Los resultados son directamente compatibles con VisitDiagnosis: cada entrada
 * tiene `code` y `label` listos para usarse en un diagnóstico provisional.
 */
export function searchCie10(query: string): Cie10DentalCode[] {
  const q = query.toLowerCase().trim();
  if (!q) return CIE10_DENTAL_CODES.slice(0, 20);

  const codeExact: Cie10DentalCode[] = [];
  const codeStartsWith: Cie10DentalCode[] = [];
  const labelStartsWith: Cie10DentalCode[] = [];
  const rest: Cie10DentalCode[] = [];

  for (const entry of CIE10_DENTAL_CODES) {
    const code = entry.code.toLowerCase();
    const label = entry.label.toLowerCase();

    if (code === q) {
      codeExact.push(entry);
    } else if (code.startsWith(q)) {
      codeStartsWith.push(entry);
    } else if (label.startsWith(q)) {
      labelStartsWith.push(entry);
    } else if (code.includes(q) || label.includes(q)) {
      rest.push(entry);
    }
  }

  return [...codeExact, ...codeStartsWith, ...labelStartsWith, ...rest].slice(0, 50);
}

/**
 * Devuelve todos los grupos únicos del catálogo en orden de aparición.
 * Útil para generar filtros de categoría en la UI.
 */
export function getCie10Groups(): string[] {
  const seen = new Set<string>();
  const groups: string[] = [];
  for (const entry of CIE10_DENTAL_CODES) {
    if (!seen.has(entry.group)) {
      seen.add(entry.group);
      groups.push(entry.group);
    }
  }
  return groups;
}

/**
 * Convierte un Cie10DentalCode en un VisitDiagnosis provisional.
 * Shortcut para cuando el clínico selecciona un código del buscador.
 */
export function cie10ToVisitDiagnosis(
  entry: Cie10DentalCode,
  overrides?: Partial<VisitDiagnosis>,
): VisitDiagnosis {
  return {
    code: entry.code,
    label: entry.label,
    status: "provisional",
    source: "manual",
    ...overrides,
  };
}
