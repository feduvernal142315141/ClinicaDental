#!/usr/bin/env node
/**
 * check-dictation-contract.mjs
 * ----------------------------
 * HU-DICT-009 — Un solo contrato, varias copias vigiladas.
 *
 * El vocabulario canónico del dictado del odontograma está escrito hoy en
 * cuatro sitios que nadie sincroniza a mano. Tres viven en el backend y las
 * compara un test JUnit (`DictationContractSourcesTest`). La cuarta es esta:
 * las uniones de tipos TypeScript de `lib/entity/speech/index.ts`.
 *
 * Este script las compara contra la fuente que el backend le impone de verdad
 * a la IA: el JSON Schema `odontogram-dictation-response-schema.json` del repo
 * hermano.
 *
 * No tiene dependencias: solo Node y lectura de ficheros.
 *
 *   yarn check:dictation-contract
 *   node scripts/check-dictation-contract.mjs
 *
 * Si el repo hermano `backend-clinic` no está al lado (otra máquina, checkout
 * parcial, CI del front solo), el script AVISA y sale con éxito: vigilar no
 * puede convertirse en romperle el build a nadie.
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRONT_ROOT = resolve(__dirname, "..");
const SCHEMA_PATH = resolve(
  FRONT_ROOT,
  "../backend-clinic/src/main/resources/odontogram/odontogram-dictation-response-schema.json",
);
const TYPES_PATH = resolve(FRONT_ROOT, "lib/entity/speech/index.ts");

/** Prefijo de las propiedades de una operación dentro del schema. */
const OP = [
  "properties",
  "toothChanges",
  "items",
  "properties",
  "operations",
  "items",
  "properties",
];

/**
 * DESVÍOS CONOCIDOS Y NO OCULTADOS.
 *
 * Divergencias reales que existen hoy y que NO se arreglan desde este script.
 * Se declaran con nombre y motivo para que la vigilancia siga siendo útil
 * frente a deriva NUEVA. En cuanto una deja de ser cierta, el script lo dice
 * y pide borrar la excepción.
 */
const DESVIOS_CONOCIDOS = [
  {
    id: "ambiguity-code-sin-union",
    descripcion:
      'OdontogramDictationAmbiguity.code está tipado como `string`, no como la ' +
      "unión de los doce códigos canónicos del schema. El front puede escribir " +
      "un código inexistente sin que TypeScript diga nada.",
    arreglo:
      "Declarar `export type OdontogramDictationAmbiguityCode = ...` con los doce " +
      "valores y usarlo en `OdontogramDictationAmbiguity.code` (y en " +
      "`OdontogramDictationInconsistency.code`, que lo copia).",
  },
  {
    id: "icdas-source-solo-en-ts",
    descripcion:
      'OdontogramDictationSurfaceDiagnosis.icdasSource ("dictated" | ' +
      '"dictation-default") no existe en el JSON Schema.',
    arreglo:
      "Ninguno: es correcto. El schema describe lo que la IA debe DEVOLVER; " +
      "icdasSource lo añade el backend después, al normalizar. No lo metas en el " +
      "schema (tiene additionalProperties:false para la salida del modelo).",
  },
];

// ── Comprobaciones: una unión TS contra un enum del schema ───────────────────

/** @type {{label: string, schema: string[], ts: object}[]} */
const CHECKS = [
  {
    label: "acciones · OdontogramDictationAction",
    schema: [...OP, "action", "enum"],
    ts: { alias: "OdontogramDictationAction" },
  },
  {
    label: "objetivos · OdontogramDictationTarget",
    schema: [...OP, "target", "enum"],
    ts: { alias: "OdontogramDictationTarget" },
  },
  {
    label: "superficies · OdontogramDictationSurface",
    schema: [...OP, "surfaces", "items", "enum"],
    ts: { alias: "OdontogramDictationSurface" },
  },
  {
    label: "tipo de hallazgo · SurfaceDiagnosis.findingKind",
    schema: [...OP, "diagnosis", "properties", "findingKind", "enum"],
    ts: { interface: "OdontogramDictationSurfaceDiagnosis", property: "findingKind" },
  },
  {
    label: "tipo de hallazgo · Match.findingKind",
    schema: [...OP, "match", "properties", "findingKind", "enum"],
    ts: { interface: "OdontogramDictationMatch", property: "findingKind" },
  },
  {
    label: "tipo de caries · SurfaceDiagnosis.cariesType",
    schema: [...OP, "diagnosis", "properties", "cariesType", "enum"],
    ts: { interface: "OdontogramDictationSurfaceDiagnosis", property: "cariesType" },
  },
  {
    label: "tipo de caries · Match.cariesType",
    schema: [...OP, "match", "properties", "cariesType", "enum"],
    ts: { interface: "OdontogramDictationMatch", property: "cariesType" },
  },
  {
    label: "actividad de caries · SurfaceDiagnosis.cariesActivity",
    schema: [...OP, "diagnosis", "properties", "cariesActivity", "enum"],
    ts: { interface: "OdontogramDictationSurfaceDiagnosis", property: "cariesActivity" },
  },
  {
    label: "actividad de caries · Match.cariesActivity",
    schema: [...OP, "match", "properties", "cariesActivity", "enum"],
    ts: { interface: "OdontogramDictationMatch", property: "cariesActivity" },
  },
  {
    label: "lesiones no cariosas · SurfaceDiagnosis.nonCariousLesions",
    schema: [...OP, "diagnosis", "properties", "nonCariousLesions", "items", "enum"],
    ts: { interface: "OdontogramDictationSurfaceDiagnosis", property: "nonCariousLesions" },
  },
  {
    label: "lesiones no cariosas · Match.nonCariousLesions",
    schema: [...OP, "match", "properties", "nonCariousLesions", "items", "enum"],
    ts: { interface: "OdontogramDictationMatch", property: "nonCariousLesions" },
  },
  {
    label: "impacto visual · SurfaceDiagnosis.visualImpact",
    schema: [...OP, "diagnosis", "properties", "visualImpact", "enum"],
    ts: { interface: "OdontogramDictationSurfaceDiagnosis", property: "visualImpact" },
  },
  {
    label: "estado pulpar · ToothDiagnosis.pulpalStatus",
    schema: [...OP, "toothDiagnosis", "properties", "pulpalStatus", "enum"],
    ts: { interface: "OdontogramDictationToothDiagnosis", property: "pulpalStatus" },
  },
  {
    label: "estado pulpar · Match.pulpalStatus",
    schema: [...OP, "match", "properties", "pulpalStatus", "enum"],
    ts: { interface: "OdontogramDictationMatch", property: "pulpalStatus" },
  },
  {
    label: "estado periapical · ToothDiagnosis.periapicalStatus",
    schema: [...OP, "toothDiagnosis", "properties", "periapicalStatus", "enum"],
    ts: { interface: "OdontogramDictationToothDiagnosis", property: "periapicalStatus" },
  },
  {
    label: "estado periapical · Match.periapicalStatus",
    schema: [...OP, "match", "properties", "periapicalStatus", "enum"],
    ts: { interface: "OdontogramDictationMatch", property: "periapicalStatus" },
  },
  {
    label: "tipo de prueba de vitalidad · VitalityTest.type",
    schema: [
      ...OP,
      "toothDiagnosis",
      "properties",
      "vitalityTests",
      "items",
      "properties",
      "type",
      "enum",
    ],
    ts: { interface: "OdontogramDictationVitalityTest", property: "type" },
  },
  {
    label: "tipo de prueba de vitalidad · Match.vitalityTestType",
    schema: [...OP, "match", "properties", "vitalityTestType", "enum"],
    ts: {
      interface: "OdontogramDictationMatch",
      property: "vitalityTestType",
      // No repite los literales: referencia la unión de la prueba de vitalidad.
      derivadoDe: {
        expresion: 'OdontogramDictationVitalityTest["type"]',
        interface: "OdontogramDictationVitalityTest",
        property: "type",
      },
    },
  },
  {
    label: "resultado de prueba de vitalidad · VitalityTest.result",
    schema: [
      ...OP,
      "toothDiagnosis",
      "properties",
      "vitalityTests",
      "items",
      "properties",
      "result",
      "enum",
    ],
    ts: { interface: "OdontogramDictationVitalityTest", property: "result" },
  },
  {
    label: "estado global de pieza · Operation.value",
    schema: [...OP, "value", "enum"],
    ts: { interface: "OdontogramDictationOperation", property: "value" },
  },
  {
    label: "tipo de match · Match.eventType",
    schema: [...OP, "match", "properties", "eventType", "enum"],
    ts: { interface: "OdontogramDictationMatch", property: "eventType" },
  },
  {
    label: "clase de diagnóstico · Match.diagnosisKind",
    schema: [...OP, "match", "properties", "diagnosisKind", "enum"],
    ts: { interface: "OdontogramDictationMatch", property: "diagnosisKind" },
  },
];

// ── Extracción de las uniones TypeScript (sin parser: texto acotado) ─────────

class ExtraccionError extends Error {}

/** Cuerpo de `export type NOMBRE = ...;` */
function aliasBody(source, name) {
  const marker = new RegExp(`export\\s+type\\s+${name}\\s*=`, "m");
  const match = marker.exec(source);
  if (!match) {
    throw new ExtraccionError(`no existe el tipo \`${name}\` en lib/entity/speech/index.ts`);
  }
  const start = match.index + match[0].length;
  const end = source.indexOf(";", start);
  if (end < 0) {
    throw new ExtraccionError(`el tipo \`${name}\` no termina en \`;\``);
  }
  return source.slice(start, end);
}

/** Cuerpo de `export interface NOMBRE { ... }`, contando llaves. */
function interfaceBody(source, name) {
  const marker = new RegExp(`export\\s+interface\\s+${name}\\s*\\{`, "m");
  const match = marker.exec(source);
  if (!match) {
    throw new ExtraccionError(`no existe la interfaz \`${name}\` en lib/entity/speech/index.ts`);
  }
  let depth = 1;
  let index = match.index + match[0].length;
  const start = index;
  while (index < source.length && depth > 0) {
    const char = source[index];
    if (char === "{") depth += 1;
    else if (char === "}") depth -= 1;
    index += 1;
  }
  if (depth !== 0) {
    throw new ExtraccionError(`la interfaz \`${name}\` no cierra`);
  }
  return source.slice(start, index - 1);
}

/** Declaración de una propiedad, desde su nombre hasta el `;` que la cierra. */
function propertyBody(body, name) {
  const marker = new RegExp(`(^|[\\n;{])\\s*${name}\\??\\s*:`, "m");
  const match = marker.exec(body);
  if (!match) {
    throw new ExtraccionError(`la propiedad \`${name}\` no está declarada`);
  }
  const start = match.index + match[0].length;
  const end = body.indexOf(";", start);
  if (end < 0) {
    throw new ExtraccionError(`la propiedad \`${name}\` no termina en \`;\``);
  }
  return body.slice(start, end);
}

function literals(text) {
  return [...text.matchAll(/"([^"\\]*)"/g)].map((match) => match[1]);
}

/** Devuelve la unión de literales declarada en TS para una comprobación. */
function tsUnion(source, spec) {
  if (spec.alias) {
    const values = literals(aliasBody(source, spec.alias));
    if (values.length === 0) {
      throw new ExtraccionError(`\`${spec.alias}\` no declara ningún literal de cadena`);
    }
    return values;
  }

  const body = interfaceBody(source, spec.interface);
  const declaration = propertyBody(body, spec.property);

  // Una propiedad puede no repetir los literales y referenciar otra unión
  // (`X["type"]`). Se resuelve ANTES de mirar literales: el propio acceso
  // indexado contiene una cadena entrecomillada que no es un valor canónico.
  if (spec.derivadoDe) {
    if (declaration.includes(spec.derivadoDe.expresion)) {
      const origen = interfaceBody(source, spec.derivadoDe.interface);
      return literals(propertyBody(origen, spec.derivadoDe.property));
    }
    if (literals(declaration).length === 0) {
      throw new ExtraccionError(
        `\`${spec.interface}.${spec.property}\` ya no referencia ` +
          `\`${spec.derivadoDe.expresion}\` ni declara literales propios`,
      );
    }
  }

  const values = literals(declaration);

  if (values.length === 0) {
    throw new ExtraccionError(
      `\`${spec.interface}.${spec.property}\` no declara literales de cadena ` +
        `(está tipada como \`${declaration.trim()}\`)`,
    );
  }
  return values;
}

// ── Navegación del JSON Schema ───────────────────────────────────────────────

function atPath(root, path) {
  let node = root;
  for (const segment of path) {
    if (node === undefined || node === null) return undefined;
    node = node[segment];
  }
  return node;
}

// ── Ejecución ────────────────────────────────────────────────────────────────

function main() {
  console.log("Contrato de dictado · uniones TS (front) vs JSON Schema (backend)\n");

  if (!existsSync(SCHEMA_PATH)) {
    console.log(
      `AVISO  no encuentro el repo hermano backend-clinic en:\n` +
        `       ${SCHEMA_PATH}\n\n` +
        `       Sin el JSON Schema no hay nada contra lo que comparar. Esto es\n` +
        `       normal en una máquina que solo tiene clonado el front, así que\n` +
        `       la comprobación se omite y no se rompe nada.`,
    );
    process.exit(0);
  }

  if (!existsSync(TYPES_PATH)) {
    console.error(`ERROR  no existe ${relative(FRONT_ROOT, TYPES_PATH)}.`);
    process.exit(1);
  }

  let schema;
  try {
    schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf8"));
  } catch (error) {
    console.error(`ERROR  el JSON Schema no es JSON válido: ${error.message}`);
    process.exit(1);
  }
  const source = readFileSync(TYPES_PATH, "utf8");

  console.log(`  schema : ${SCHEMA_PATH}`);
  console.log(`  tipos  : ${TYPES_PATH}\n`);

  const fallos = [];

  for (const check of CHECKS) {
    const enumValues = atPath(schema, check.schema);
    if (!Array.isArray(enumValues) || enumValues.length === 0) {
      fallos.push({
        label: check.label,
        detalle: [
          `el schema no tiene un enum en /${check.schema.join("/")}`,
          "o cambió la forma del schema, o el puntero de este script está obsoleto",
        ],
      });
      console.log(`  FALLO  ${check.label}`);
      continue;
    }

    let tsValues;
    try {
      tsValues = tsUnion(source, check.ts);
    } catch (error) {
      if (!(error instanceof ExtraccionError)) throw error;
      fallos.push({ label: check.label, detalle: [`en TypeScript: ${error.message}`] });
      console.log(`  FALLO  ${check.label}`);
      continue;
    }

    const enSchema = new Set(enumValues.map(String));
    const enTs = new Set(tsValues);
    const faltanEnTs = [...enSchema].filter((value) => !enTs.has(value));
    const sobranEnTs = [...enTs].filter((value) => !enSchema.has(value));

    if (faltanEnTs.length === 0 && sobranEnTs.length === 0) {
      console.log(`  OK     ${check.label}  (${enSchema.size} valores)`);
      continue;
    }

    const detalle = [];
    if (faltanEnTs.length > 0) {
      detalle.push(
        `FALTA en TypeScript (está en el schema): ${faltanEnTs.map((v) => `"${v}"`).join(", ")}`,
      );
    }
    if (sobranEnTs.length > 0) {
      detalle.push(
        `SOBRA en TypeScript (no está en el schema): ${sobranEnTs.map((v) => `"${v}"`).join(", ")}`,
      );
    }
    fallos.push({ label: check.label, detalle });
    console.log(`  FALLO  ${check.label}`);
  }

  if (DESVIOS_CONOCIDOS.length > 0) {
    console.log("\nDesvíos conocidos y tolerados (documentados en este mismo script):");
    for (const desvio of DESVIOS_CONOCIDOS) {
      console.log(`  · [${desvio.id}] ${desvio.descripcion}`);
      console.log(`      arreglo: ${desvio.arreglo}`);
    }
  }

  if (fallos.length === 0) {
    console.log(
      `\n${CHECKS.length} uniones comprobadas, ninguna deriva nueva. ` +
        "El contrato del front sigue pegado al del backend.",
    );
    process.exit(0);
  }

  console.error(`\n${fallos.length} de ${CHECKS.length} uniones divergen del JSON Schema:\n`);
  for (const fallo of fallos) {
    console.error(`  ${fallo.label}`);
    for (const linea of fallo.detalle) {
      console.error(`      ${linea}`);
    }
    console.error("");
  }
  console.error(
    "Decide cuál de las dos copias es la correcta y alinea la otra. Si la\n" +
      "correcta es el schema, cambia lib/entity/speech/index.ts; si el contrato\n" +
      "cambió de verdad, hay que moverlo TAMBIÉN en el validador, el yml y el\n" +
      "prompt del backend (lo vigila DictationContractSourcesTest).",
  );
  process.exit(1);
}

main();
