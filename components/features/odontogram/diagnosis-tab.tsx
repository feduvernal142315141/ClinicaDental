"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  OdontogramCheckbox,
  OdontogramInput,
} from "@/components/odontogram/ui";
import {
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Info,
  Upload,
  Copy,
  ArrowRight,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import type {
  Tooth,
  ToothDiagnosis,
  ToothSurface,
  SurfaceDiagnosis,
  ICDASScore,
  CariesType,
  CariesActivity,
  NonCariousLesion,
  PulpalStatus,
  PeriapicalStatus,
  VitalityTest,
  VitalityTestType,
  VitalityTestResult,
  PatientRiskLevel,
} from "./types";
import {
  ICDAS_LABELS,
  ICDAS_DESCRIPTIONS,
  PULPAL_STATUS_LABELS,
  PERIAPICAL_STATUS_LABELS,
  NON_CARIOUS_LESION_LABELS,
  VITALITY_TEST_LABELS,
  GLOBAL_STATUS_LABELS,
} from "./types";
import { ODONTOGRAM_STATE_COLORS } from "@/lib/odontogram/domain/odontogram/constants/odontogram-colors.constants";
import { ToothTypeService } from "@/lib/odontogram/domain/odontogram/services/ToothTypeService";
import { isToothPhysicallyAbsent } from "@/lib/odontogram/domain/odontogram/constants/tooth-status.constants";

interface DiagnosisTabProps {
  tooth: Tooth;
  selectedSurfaces: ToothSurface[];
  initialDiagnoses?: Map<ToothSurface, SurfaceDiagnosis>;
  initialToothDiagnosis?: ToothDiagnosis;
  patientRisk?: PatientRiskLevel;
  patientRiskReasons?: string[];
  onNavigateToTab?: (tab: string) => void;
  onDiagnosesChange?: (diagnoses: Map<ToothSurface, SurfaceDiagnosis>) => void;
  onToothDiagnosisChange?: (diagnosis: ToothDiagnosis) => void;
}

function getICDASColor(score: ICDASScore): string {
  // Verde "sano" para el badge del modal; para 1-6, la MISMA rampa que la grilla.
  if (score === 0) return "#10B981";
  return ODONTOGRAM_STATE_COLORS.CARIES_ACTIVE[score as 1 | 2 | 3 | 4 | 5 | 6];
}

function getLesionIcon(lesion: NonCariousLesion): string {
  const icons: Record<NonCariousLesion, string> = {
    atricion: "⚡",
    abrasion: "🔨",
    erosion: "💧",
    hipoplasia: "⭕",
    fisura: "⚠️",
    fractura: "💥",
  };
  return icons[lesion] || "•";
}

/**
 * Lista canónica de pruebas de vitalidad (v2 — 7 pruebas).
 * Usada para inicializar el estado y para fusionar datos guardados
 * con versiones anteriores que solo tenían 5 pruebas.
 */
const CANONICAL_VITALITY_DEFAULTS: VitalityTest[] = [
  { type: "frio",               result: "no-realizado" },
  { type: "calor",              result: "no-realizado" },
  { type: "ept",                result: "no-realizado" },
  { type: "percusion-horizontal", result: "no-realizado" },
  { type: "percusion-vertical",   result: "no-realizado" },
  { type: "palpacion",          result: "no-realizado" },
  { type: "dulce",              result: "no-realizado" },
];

/**
 * Fusiona los resultados guardados sobre la lista canónica.
 * Garantiza que siempre aparezcan las 7 pruebas, preservando
 * resultados ya registrados para los tipos que coincidan.
 * Tipos obsoletos (p.ej. "percusion") se descartan silenciosamente.
 */
function mergeVitalityTests(stored: VitalityTest[] | undefined): VitalityTest[] {
  const storedMap = new Map(stored?.map((t) => [t.type, t]) ?? []);
  return CANONICAL_VITALITY_DEFAULTS.map(
    (def) => storedMap.get(def.type) ?? def,
  );
}

export function DiagnosisTab({
  tooth,
  selectedSurfaces,
  initialDiagnoses,
  initialToothDiagnosis,
  patientRisk = "medio",
  patientRiskReasons,
  onNavigateToTab,
  onDiagnosesChange,
  onToothDiagnosisChange,
}: DiagnosisTabProps) {
  const [activeSurface, setActiveSurface] = useState<ToothSurface | null>(
    selectedSurfaces.length > 0 ? selectedSurfaces[0] : null,
  );
  const [surfaceDiagnoses, setSurfaceDiagnoses] = useState<
    Map<ToothSurface, SurfaceDiagnosis>
  >(new Map());

  const [icdasScore, setIcdasScore] = useState<ICDASScore>(0);
  const [cariesType, setCariesType] = useState<CariesType>("coronal");
  const [cariesActivity, setCariesActivity] =
    useState<CariesActivity>("no-aplica");
  const [nonCariousLesions, setNonCariousLesions] = useState<
    NonCariousLesion[]
  >([]);
  const [surfaceNotes, setSurfaceNotes] = useState("");

  const [pulpalStatus, setPulpalStatus] = useState<PulpalStatus>("normal");
  const [periapicalStatus, setPeriapicalStatus] =
    useState<PeriapicalStatus>("normal");
  const [vitalityTests, setVitalityTests] = useState<VitalityTest[]>(
    CANONICAL_VITALITY_DEFAULTS,
  );
  const [painScore, setPainScore] = useState<number>(0);
  const [painDescription, setPainDescription] = useState<string>("");
  const [generalNotes, setGeneralNotes] = useState("");
  const [evidenceExpanded, setEvidenceExpanded] = useState(false);

  const buildToothDiagnosisRecord = (
    nextDiagnoses: Map<ToothSurface, SurfaceDiagnosis>,
    overrides?: Partial<ToothDiagnosis>,
  ): ToothDiagnosis => ({
    toothNumber: tooth.number,
    surfaceDiagnoses: Array.from(nextDiagnoses.values()),
    pulpalStatus: overrides?.pulpalStatus ?? pulpalStatus,
    periapicalStatus: overrides?.periapicalStatus ?? periapicalStatus,
    vitalityTests: overrides?.vitalityTests ?? vitalityTests,
    painScore: overrides?.painScore ?? painScore,
    painDescription: overrides?.painDescription ?? painDescription,
    generalNotes: overrides?.generalNotes ?? generalNotes,
    attachments: overrides?.attachments ?? initialToothDiagnosis?.attachments,
    evidenceRefs:
      overrides?.evidenceRefs ?? initialToothDiagnosis?.evidenceRefs ?? [],
    completionState: overrides?.completionState ?? "draft",
    diagnosedDate:
      overrides?.diagnosedDate ??
      initialToothDiagnosis?.diagnosedDate ??
      new Date().toISOString(),
    diagnosedBy: overrides?.diagnosedBy ?? initialToothDiagnosis?.diagnosedBy,
    updatedAt: new Date().toISOString(),
  });

  const emitToothDiagnosisChange = (
    nextDiagnoses: Map<ToothSurface, SurfaceDiagnosis>,
    overrides?: Partial<ToothDiagnosis>,
  ) => {
    if (!onToothDiagnosisChange) return;
    onToothDiagnosisChange(buildToothDiagnosisRecord(nextDiagnoses, overrides));
  };

  useEffect(() => {
    if (initialDiagnoses && initialDiagnoses.size > 0) {
      setSurfaceDiagnoses(new Map(initialDiagnoses));

      if (activeSurface) {
        const diagnosis = initialDiagnoses.get(activeSurface);
        if (diagnosis) {
          setIcdasScore(diagnosis.icdasScore);
          setCariesType(diagnosis.cariesType || "coronal");
          setCariesActivity(diagnosis.cariesActivity || "no-aplica");
          setNonCariousLesions(diagnosis.nonCariousLesions);
          setSurfaceNotes(diagnosis.notes || "");
        }
      }
    }
  }, [activeSurface, initialDiagnoses]);

  useEffect(() => {
    if (!initialToothDiagnosis) return;

    setPulpalStatus(initialToothDiagnosis.pulpalStatus || "normal");
    setPeriapicalStatus(initialToothDiagnosis.periapicalStatus || "normal");
    setVitalityTests(mergeVitalityTests(initialToothDiagnosis.vitalityTests));
    setPainScore(initialToothDiagnosis.painScore ?? 0);
    setPainDescription(initialToothDiagnosis.painDescription ?? "");
    setGeneralNotes(initialToothDiagnosis.generalNotes || "");
  }, [initialToothDiagnosis]);

  const loadSurfaceDiagnosis = (surface: ToothSurface) => {
    const diagnosis = surfaceDiagnoses.get(surface);
    if (diagnosis) {
      setIcdasScore(diagnosis.icdasScore);
      setCariesType(diagnosis.cariesType || "coronal");
      setCariesActivity(diagnosis.cariesActivity || "no-aplica");
      setNonCariousLesions(diagnosis.nonCariousLesions);
      setSurfaceNotes(diagnosis.notes || "");
    } else {
      setIcdasScore(0);
      setCariesType("coronal");
      setCariesActivity("no-aplica");
      setNonCariousLesions([]);
      setSurfaceNotes("");
    }
  };

  const saveDiagnosis = (
    overrides?: Partial<{
      icdasScore: ICDASScore;
      cariesType: CariesType;
      cariesActivity: CariesActivity;
      nonCariousLesions: NonCariousLesion[];
    }>,
  ) => {
    if (!activeSurface) return;

    const effectiveIcdas = overrides?.icdasScore ?? icdasScore;
    const effectiveCariesType = overrides?.cariesType ?? cariesType;
    const effectiveActivity = overrides?.cariesActivity ?? cariesActivity;
    const effectiveLesions = overrides?.nonCariousLesions ?? nonCariousLesions;

    const diagnosis: SurfaceDiagnosis = {
      surface: activeSurface,
      icdasScore: effectiveIcdas,
      cariesType: effectiveIcdas >= 3 ? effectiveCariesType : undefined,
      cariesActivity: effectiveIcdas >= 3 ? effectiveActivity : undefined,
      nonCariousLesions: effectiveLesions,
      notes: surfaceNotes,
      lastUpdate: new Date().toISOString(),
    };

    const newMap = new Map(surfaceDiagnoses);
    newMap.set(activeSurface, diagnosis);
    setSurfaceDiagnoses(newMap);

    if (onDiagnosesChange) {
      onDiagnosesChange(newMap);
    }

    emitToothDiagnosisChange(newMap);
  };

  const handlePulpalStatusChange = (status: PulpalStatus) => {
    setPulpalStatus(status);
    emitToothDiagnosisChange(surfaceDiagnoses, { pulpalStatus: status });
  };

  const handleSurfaceChange = (surface: ToothSurface) => {
    if (activeSurface) {
      saveDiagnosis();
    }
    setActiveSurface(surface);
    loadSurfaceDiagnosis(surface);
  };

  const handleApplyToAll = () => {
    if (!activeSurface) return;

    const diagnosis: SurfaceDiagnosis = {
      surface: activeSurface,
      icdasScore,
      cariesType: icdasScore >= 3 ? cariesType : undefined,
      cariesActivity: icdasScore >= 3 ? cariesActivity : undefined,
      nonCariousLesions,
      notes: surfaceNotes,
      lastUpdate: new Date().toISOString(),
    };

    const newMap = new Map(surfaceDiagnoses);
    selectedSurfaces.forEach((surface) => {
      newMap.set(surface, { ...diagnosis, surface });
    });
    setSurfaceDiagnoses(newMap);

    if (onDiagnosesChange) {
      onDiagnosesChange(newMap);
    }

    emitToothDiagnosisChange(newMap);
  };

  const handleCopyToAdjacent = () => {
    if (!activeSurface) return;

    const diagnosis = surfaceDiagnoses.get(activeSurface);
    if (!diagnosis) return;

    const adjacentSurfaces: ToothSurface[] = [];
    if (selectedSurfaces.includes("mesial")) adjacentSurfaces.push("mesial");
    if (selectedSurfaces.includes("distal")) adjacentSurfaces.push("distal");

    const newMap = new Map(surfaceDiagnoses);
    adjacentSurfaces.forEach((surface) => {
      newMap.set(surface, {
        ...diagnosis,
        surface,
        lastUpdate: new Date().toISOString(),
      });
    });
    setSurfaceDiagnoses(newMap);

    if (onDiagnosesChange) {
      onDiagnosesChange(newMap);
    }

    emitToothDiagnosisChange(newMap);
  };

  const handleVitalityTestChange = (
    type: VitalityTestType,
    result: VitalityTestResult,
  ) => {
    const nextTests = vitalityTests.map((test) =>
      test.type === type ? { ...test, result } : test,
    );
    setVitalityTests(nextTests);
    emitToothDiagnosisChange(surfaceDiagnoses, { vitalityTests: nextTests });
  };

  const getRiskColor = (risk: PatientRiskLevel) => {
    if (risk === "bajo") return "bg-emerald-500/15 text-emerald-600 ring-emerald-400/25 dark:text-emerald-300";
    if (risk === "medio") return "bg-amber-500/15 text-amber-600 ring-amber-400/25 dark:text-amber-300";
    return "bg-rose-500/15 text-rose-600 ring-rose-400/25 dark:text-rose-300";
  };

  const hasCoherenceIssue =
    isToothPhysicallyAbsent(tooth.globalStatus) &&
    Array.from(surfaceDiagnoses.values()).some((d) => d.icdasScore > 0);

  const hasMixedState =
    (tooth.globalStatus === "crown_pending" ||
      tooth.globalStatus === "crown_done") &&
    Array.from(surfaceDiagnoses.values()).some((d) => d.icdasScore >= 3);

  if (selectedSurfaces.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground mb-4">
          No hay superficies seleccionadas para diagnosticar
        </p>
        <Button
          variant="outline"
          onClick={() => onNavigateToTab?.("superficies")}
        >
          ← Volver a Superficies
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4 h-full">
      {/* Header compacto */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold">
            Diagnóstico · Diente {tooth.number}
          </h3>
          <p className="text-sm text-muted-foreground">
            {ToothTypeService.getToothTypeName(tooth.number)} · {selectedSurfaces.length}{" "}
            superficie
            {selectedSurfaces.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge
            variant="outline"
            className={getRiskColor(patientRisk)}
            title={patientRiskReasons?.join(" · ")}
          >
            Riesgo: {patientRisk.charAt(0).toUpperCase() + patientRisk.slice(1)}
          </Badge>
          <Badge variant="outline" className="bg-muted">
            {GLOBAL_STATUS_LABELS[tooth.globalStatus]}
          </Badge>
        </div>
      </div>

      {hasCoherenceIssue && (
        <Card className="p-3 bg-rose-500/15 border-rose-400/25">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-300 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-rose-700 dark:text-rose-300">
                Revisa el estado del diente
              </p>
              <p className="text-xs text-rose-600 dark:text-rose-300">
                El diente está marcado como{" "}
                {GLOBAL_STATUS_LABELS[tooth.globalStatus]} pero tiene
                diagnóstico de caries
              </p>
            </div>
          </div>
        </Card>
      )}

      {hasMixedState && (
        <Card className="p-3 bg-amber-500/15 border-amber-400/25">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-300 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                Estado mixto detectado
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-300">
                Restauración existente con caries secundaria - considerar
                retiro/recambio
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Panel principal: dos columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-4">
        {/* Columna A: Controles clínicos */}
        <div className="space-y-4">
          {/* 2.1 Selección activa */}
          <Card className="p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-semibold">Superficie activa</Label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyToAdjacent}
                  className="text-xs bg-transparent"
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copiar a M/D
                </Button>
                <Button
                  size="sm"
                  variant="default"
                  onClick={handleApplyToAll}
                  className="text-xs"
                >
                  Aplicar a todas
                </Button>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {selectedSurfaces.map((surface) => {
                const diagnosis = surfaceDiagnoses.get(surface);
                const isActive = activeSurface === surface;
                return (
                  <Badge
                    key={surface}
                    variant={isActive ? "default" : "outline"}
                    className="cursor-pointer px-3 py-1.5 text-sm transition-all"
                    style={
                      diagnosis
                        ? {
                            backgroundColor: isActive
                              ? getICDASColor(diagnosis.icdasScore)
                              : "transparent",
                            borderColor: getICDASColor(diagnosis.icdasScore),
                            color: isActive
                              ? "white"
                              : getICDASColor(diagnosis.icdasScore),
                          }
                        : undefined
                    }
                    onClick={() => handleSurfaceChange(surface)}
                  >
                    {surface.charAt(0).toUpperCase()}
                    {diagnosis &&
                      diagnosis.icdasScore > 0 &&
                      ` (${diagnosis.icdasScore})`}
                    {diagnosis && diagnosis.nonCariousLesions.length > 0 && (
                      <span className="ml-1">
                        {getLesionIcon(diagnosis.nonCariousLesions[0])}
                      </span>
                    )}
                  </Badge>
                );
              })}
            </div>
          </Card>

          {/* 2.2 Caries (ICDAS) */}
          <Card className="p-4 shadow-sm">
            <Label className="text-sm font-semibold mb-3 block">
              Caries (ICDAS)
            </Label>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Puntuación ICDAS</span>
                  <Badge
                    className="text-sm px-3 py-1"
                    style={{
                      backgroundColor: getICDASColor(icdasScore),
                      color: "white",
                    }}
                  >
                    {icdasScore} - {ICDAS_LABELS[icdasScore]}
                  </Badge>
                </div>
                <Slider
                  value={[icdasScore]}
                  onValueChange={(value) => {
                    const score = value[0] as ICDASScore;
                    setIcdasScore(score);
                    saveDiagnosis({ icdasScore: score });
                  }}
                  min={0}
                  max={6}
                  step={1}
                  className="mb-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground px-1">
                  {[0, 1, 2, 3, 4, 5, 6].map((score) => (
                    <span key={score} className="w-8 text-center">
                      {score}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-3 p-2 bg-muted/50 rounded">
                  {ICDAS_DESCRIPTIONS[icdasScore]}
                </p>
              </div>

              {icdasScore >= 3 && (
                <>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <Label className="text-xs mb-2 block">
                        Tipo de caries
                      </Label>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={
                            cariesType === "coronal" ? "default" : "outline"
                          }
                          onClick={() => {
                            setCariesType("coronal");
                            saveDiagnosis({ cariesType: "coronal" });
                          }}
                          className="flex-1"
                        >
                          Coronal
                        </Button>
                        <Button
                          size="sm"
                          variant={
                            cariesType === "radicular" ? "default" : "outline"
                          }
                          onClick={() => {
                            setCariesType("radicular");
                            saveDiagnosis({ cariesType: "radicular" });
                          }}
                          className="flex-1"
                        >
                          Radicular
                        </Button>
                      </div>
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs mb-2 block">Actividad</Label>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={
                            cariesActivity === "activa" ? "default" : "outline"
                          }
                          onClick={() => {
                            setCariesActivity("activa");
                            saveDiagnosis({ cariesActivity: "activa" });
                          }}
                          className="flex-1"
                        >
                          Activa
                        </Button>
                        <Button
                          size="sm"
                          variant={
                            cariesActivity === "inactiva"
                              ? "default"
                              : "outline"
                          }
                          onClick={() => {
                            setCariesActivity("inactiva");
                            saveDiagnosis({ cariesActivity: "inactiva" });
                          }}
                          className="flex-1"
                        >
                          Inactiva
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </Card>

          {/* 2.3 Lesiones no cariosas */}
          <Card className="p-4 shadow-sm">
            <Label className="text-sm font-semibold mb-3 block">
              Lesiones no cariosas
            </Label>
            <div className="grid grid-cols-2 gap-3 mb-3">
              {(
                Object.entries(NON_CARIOUS_LESION_LABELS) as [
                  NonCariousLesion,
                  string,
                ][]
              ).map(([lesion, label]) => (
                <div key={lesion} className="flex items-center space-x-2">
                  <OdontogramCheckbox
                    id={lesion}
                    checked={nonCariousLesions.includes(lesion)}
                    onChange={() => {
                      const newLesions = nonCariousLesions.includes(lesion)
                        ? nonCariousLesions.filter((l) => l !== lesion)
                        : [...nonCariousLesions, lesion];
                      setNonCariousLesions(newLesions);
                      saveDiagnosis({ nonCariousLesions: newLesions });
                    }}
                  >
                    <span className="text-sm cursor-pointer">
                      {getLesionIcon(lesion)} {label}
                    </span>
                  </OdontogramCheckbox>
                </div>
              ))}
            </div>
            <div>
              <Label htmlFor="surface-notes" className="text-xs mb-1 block">
                Notas breves
              </Label>
              <OdontogramInput
                id="surface-notes"
                value={surfaceNotes}
                onChange={(e) => setSurfaceNotes(e.target.value)}
                onBlur={saveDiagnosis}
                placeholder="Observaciones adicionales..."
                className="text-sm"
              />
            </div>
          </Card>

          {/* 2.4 Estado pulpar/periapical — Segmented controls */}
          <Card className="p-4 shadow-sm">
            <Label className="text-sm font-semibold mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-brand/10 text-brand flex items-center justify-center text-xs font-bold">3</span>
              Estado pulpar / periapical{" "}
              <Badge variant="outline" className="text-[10px]">Nivel pieza</Badge>
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Pulpar — Segmented */}
              <div>
                <Label className="text-xs mb-2 block text-muted-foreground">Estado pulpar</Label>
                <div className="flex flex-wrap gap-1">
                  {(
                    Object.entries(PULPAL_STATUS_LABELS) as [
                      PulpalStatus,
                      string,
                    ][]
                  ).map(([status, label]) => {
                    const isActive = pulpalStatus === status;
                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={() => handlePulpalStatusChange(status)}
                        className={`px-2.5 py-1 text-xs rounded-md border transition-all font-medium ${
                          isActive
                            ? "bg-brand text-white border-brand shadow-sm"
                            : "bg-elevated text-subtle border-hairline hover:bg-hover"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* Periapical — Segmented */}
              <div>
                <Label className="text-xs mb-2 block text-muted-foreground">Estado periapical</Label>
                <div className="flex flex-wrap gap-1">
                  {(
                    Object.entries(PERIAPICAL_STATUS_LABELS) as [
                      PeriapicalStatus,
                      string,
                    ][]
                  ).map(([status, label]) => {
                    const isActive = periapicalStatus === status;
                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={() => {
                          const nextStatus = status as PeriapicalStatus;
                          setPeriapicalStatus(nextStatus);
                          emitToothDiagnosisChange(surfaceDiagnoses, {
                            periapicalStatus: nextStatus,
                          });
                        }}
                        className={`px-2.5 py-1 text-xs rounded-md border transition-all font-medium ${
                          isActive
                            ? "bg-brand text-white border-brand shadow-sm"
                            : "bg-elevated text-subtle border-hairline hover:bg-hover"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </Card>

          {/* 2.5 Vitalidad y pruebas — Compact table */}
          <Card className="p-4 shadow-sm">
            <Label className="text-sm font-semibold mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-brand/10 text-brand flex items-center justify-center text-xs font-bold">4</span>
              Vitalidad y pruebas
            </Label>
            <div className="space-y-3">
              {/* Vitality table */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">Prueba</th>
                      <th className="text-center px-2 py-1.5 font-medium text-muted-foreground w-20">Resultado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vitalityTests.map((test) => (
                      <tr key={test.type} className="border-t">
                        <td className="px-3 py-2 font-medium">
                          {VITALITY_TEST_LABELS[test.type]}
                        </td>
                        <td className="px-2 py-1.5">
                          <div className="flex justify-center gap-0.5">
                            {([
                              {
                                value: "positivo",
                                label: "+",
                                activeClass:
                                  "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
                              },
                              {
                                value: "negativo",
                                label: "−",
                                activeClass:
                                  "bg-rose-500/15 text-rose-400 border-rose-500/30",
                              },
                              {
                                value: "no-realizado",
                                label: "NR",
                                activeClass:
                                  "bg-hover text-subtle border-hairline",
                              },
                            ] as const).map(({ value, label, activeClass }) => {
                              const isActive = test.result === value;
                              return (
                                <button
                                  key={value}
                                  type="button"
                                  onClick={() =>
                                    handleVitalityTestChange(
                                      test.type,
                                      value as VitalityTestResult,
                                    )
                                  }
                                  className={`w-8 h-6 rounded border text-xs font-bold transition-all ${
                                    isActive
                                      ? `${activeClass} shadow-sm`
                                      : "border-transparent bg-elevated text-subtle hover:bg-hover"
                                  }`}
                                >
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pain scale — Wong-Baker FACES */}
              <div>
                <Label className="text-xs mb-2 block">
                  Dolor
                </Label>
                <div className="flex items-center gap-1">
                  {([
                    { score: 0,  emoji: "😊", label: "Sin dolor",    bg: "#dcfce7", border: "#86efac", text: "#166534" },
                    { score: 2,  emoji: "🙂", label: "Leve",         bg: "#fef9c3", border: "#fde047", text: "#854d0e" },
                    { score: 4,  emoji: "😐", label: "Moderado",     bg: "#fed7aa", border: "#fdba74", text: "#9a3412" },
                    { score: 6,  emoji: "😟", label: "Considerable", bg: "#fecaca", border: "#fca5a5", text: "#991b1b" },
                    { score: 8,  emoji: "😢", label: "Severo",       bg: "#fda4af", border: "#fb7185", text: "#881337" },
                    { score: 10, emoji: "😭", label: "Insoportable", bg: "#f87171", border: "#ef4444", text: "#fff" },
                  ] as const).map(({ score, emoji, label, bg, border, text }) => {
                    const isSelected = painScore === score;
                    return (
                      <button
                        key={score}
                        type="button"
                        onClick={() => {
                          setPainScore(score);
                          emitToothDiagnosisChange(surfaceDiagnoses, {
                            painScore: score,
                          });
                        }}
                        className="flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 transition-all cursor-pointer"
                        style={{
                          backgroundColor: isSelected ? bg : "transparent",
                          border: isSelected ? `2px solid ${border}` : "2px solid transparent",
                          transform: isSelected ? "scale(1.12)" : "scale(1)",
                          opacity: isSelected ? 1 : 0.6,
                        }}
                        title={`${score} — ${label}`}
                      >
                        <span className="text-xl leading-none">{emoji}</span>
                        <span
                          className="text-[9px] font-medium leading-tight"
                          style={{ color: isSelected ? text : "#6b7280" }}
                        >
                          {score}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {painScore > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {painScore === 2 && "Dolor leve — molestia menor"}
                    {painScore === 4 && "Dolor moderado — interfiere levemente"}
                    {painScore === 6 && "Dolor considerable — dificulta actividad"}
                    {painScore === 8 && "Dolor severo — muy difícil de tolerar"}
                    {painScore === 10 && "Dolor insoportable — el peor posible"}
                  </p>
                )}
                {/* Descripción libre del dolor */}
                <div className="mt-2">
                  <Label className="text-xs mb-1 block text-muted-foreground">
                    Descripción del dolor
                  </Label>
                  <textarea
                    value={painDescription}
                    onChange={(e) => {
                      const next = e.target.value;
                      setPainDescription(next);
                      emitToothDiagnosisChange(surfaceDiagnoses, {
                        painDescription: next,
                      });
                    }}
                    placeholder="Ej: dolor punzante al morder, irradiado al oído derecho…"
                    rows={2}
                    className="w-full resize-none rounded-lg border border-hairline bg-elevated px-3 py-2 text-xs text-ink placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* 2.6 Evidencia — Collapsed by default */}
          <Card className="p-4 shadow-sm">
            <button
              type="button"
              onClick={() => setEvidenceExpanded(!evidenceExpanded)}
              className="flex items-center gap-2 w-full text-left"
            >
              {evidenceExpanded ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
              <Label className="text-sm font-semibold cursor-pointer flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-brand/10 text-brand flex items-center justify-center text-xs font-bold">5</span>
                Evidencia
              </Label>
              <span className="text-xs text-muted-foreground ml-auto">
                {evidenceExpanded ? "Ocultar" : "Adjuntar archivos"}
              </span>
            </button>
            {evidenceExpanded && (
              <div className="mt-3 border-2 border-dashed rounded-lg p-6 text-center text-muted-foreground hover:border-brand/50 transition-colors cursor-pointer">
                <Upload className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  Arrastra archivos aquí o haz clic para seleccionar
                </p>
                <p className="text-xs mt-1">
                  Fotos intraorales, radiografías, etc.
                </p>
              </div>
            )}
          </Card>
        </div>

        {/* Columna B: Resumen & Sugerencias */}
        <div className="space-y-4">
          {/* 3.1 Resumen en vivo */}
          <Card className="p-4 shadow-sm">
            <Label className="text-sm font-semibold mb-3 block">
              Resumen en vivo
            </Label>
            <div className="space-y-2">
              {selectedSurfaces.map((surface) => {
                const diagnosis = surfaceDiagnoses.get(surface);
                // Color CLÍNICO (rampa ICDAS) solo cuando hay diagnóstico;
                // sin diagnóstico el chip usa tokens de chrome UI.
                const color = diagnosis
                  ? getICDASColor(diagnosis.icdasScore)
                  : undefined;
                return (
                  <div
                    key={surface}
                    className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${
                      color ? "" : "border-hairline bg-hover"
                    }`}
                    style={
                      color
                        ? { borderColor: color, backgroundColor: `${color}15` }
                        : undefined
                    }
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-bold ${color ? "" : "text-subtle"}`}
                        style={color ? { color } : undefined}
                      >
                        {surface.charAt(0).toUpperCase()}
                      </span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                      <span className="text-sm">
                        {diagnosis
                          ? ICDAS_LABELS[diagnosis.icdasScore]
                          : "Sin diagnóstico"}
                      </span>
                      {diagnosis &&
                        diagnosis.cariesActivity &&
                        diagnosis.cariesActivity !== "no-aplica" && (
                          <Badge variant="outline" className="text-xs">
                            {diagnosis.cariesActivity === "activa"
                              ? "Activa"
                              : "Inactiva"}
                          </Badge>
                        )}
                    </div>
                    {diagnosis && diagnosis.nonCariousLesions.length > 0 && (
                      <div className="flex gap-1">
                        {diagnosis.nonCariousLesions.map((lesion) => (
                          <span
                            key={lesion}
                            className="text-sm"
                            title={NON_CARIOUS_LESION_LABELS[lesion]}
                          >
                            {getLesionIcon(lesion)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* 3.2 Sugerencias de Plan */}
          <Card className="p-4 shadow-sm">
            <Label className="text-sm font-semibold mb-3 block">
              Sugerencias de plan
            </Label>
            <div className="space-y-2">
              {(pulpalStatus === "irreversible" ||
                pulpalStatus === "necrosis") && (
                <div className="p-3 bg-rose-500/15 border border-rose-400/25 rounded-lg shadow-sm">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-300 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-rose-700 dark:text-rose-300">
                        Endodoncia requerida
                      </p>
                      <p className="text-xs text-rose-600 dark:text-rose-300 mt-1">
                        Estado pulpar{" "}
                        {PULPAL_STATUS_LABELS[pulpalStatus].toLowerCase()}{" "}
                        detectado
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {Array.from(surfaceDiagnoses.values()).some(
                (d) => d.icdasScore >= 5,
              ) && (
                <div className="p-3 bg-rose-500/15 border border-rose-400/25 rounded-lg shadow-sm">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-300 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-rose-700 dark:text-rose-300">
                        Restauración extensa / Onlay / Endo
                      </p>
                      <p className="text-xs text-rose-600 dark:text-rose-300 mt-1">
                        Caries con cavitación extensa - evaluar endodoncia si
                        hay síntomas
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {Array.from(surfaceDiagnoses.values()).some(
                (d) => d.icdasScore >= 3 && d.icdasScore <= 4,
              ) && (
                <div className="p-3 bg-amber-500/15 border border-amber-400/25 rounded-lg shadow-sm">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-300 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                        Resina (Plan)
                      </p>
                      <p className="text-xs text-amber-600 dark:text-amber-300 mt-1">
                        Caries con microcavitación - restauración con resina
                        compuesta
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {Array.from(surfaceDiagnoses.values()).some(
                (d) => d.icdasScore >= 1 && d.icdasScore <= 2,
              ) && (
                <div className="p-3 bg-amber-500/15 border border-amber-400/25 rounded-lg shadow-sm">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-amber-600 dark:text-amber-300 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                        Infiltración / Sellante
                      </p>
                      <p className="text-xs text-amber-600 dark:text-amber-300 mt-1">
                        Caries incipiente - tratamiento preventivo con sellantes
                        o flúor
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {Array.from(surfaceDiagnoses.values()).every(
                (d) => d.icdasScore === 0,
              ) && (
                <div className="p-3 bg-emerald-500/15 border border-emerald-400/25 rounded-lg shadow-sm">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-300 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                        Superficies sanas
                      </p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-300 mt-1">
                        Mantener higiene y controles periódicos
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Button
              className="w-full mt-3"
              onClick={() => onNavigateToTab?.("plan")}
            >
              Crear Plan ahora
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Card>

          {/* Leyenda ICDAS */}
          <Card className="p-4 bg-muted/30 shadow-sm">
            <Label className="text-xs font-semibold mb-2 block">
              Leyenda ICDAS
            </Label>
            <div className="space-y-1.5">
              {([0, 1, 2, 3, 4, 5, 6] as ICDASScore[]).map((score) => (
                <div key={score} className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded shrink-0"
                    style={{ backgroundColor: getICDASColor(score) }}
                  />
                  <span className="text-xs">{ICDAS_LABELS[score]}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
