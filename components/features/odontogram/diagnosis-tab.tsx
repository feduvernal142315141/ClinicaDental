"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Info,
  Upload,
  Copy,
  ArrowRight,
} from "lucide-react";
import type {
  Tooth,
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

interface DiagnosisTabProps {
  tooth: Tooth;
  selectedSurfaces: ToothSurface[];
  initialDiagnoses?: Map<ToothSurface, SurfaceDiagnosis>;
  initialPulpalStatus?: PulpalStatus;
  patientRisk?: PatientRiskLevel;
  onNavigateToTab?: (tab: string) => void;
  onDiagnosesChange?: (diagnoses: Map<ToothSurface, SurfaceDiagnosis>) => void;
  onPulpalStatusChange?: (status: PulpalStatus) => void;
}

function getToothTypeName(toothNumber: number): string {
  const lastDigit = toothNumber % 10;
  if (lastDigit === 1 || lastDigit === 2) return "Incisivo";
  if (lastDigit === 3) return "Canino";
  if (lastDigit === 4 || lastDigit === 5) return "Premolar";
  if (lastDigit === 6 || lastDigit === 7 || lastDigit === 8) return "Molar";
  return "Diente";
}

function getICDASColor(score: ICDASScore): string {
  if (score === 0) return "#10B981";
  if (score <= 2) return "#F59E0B";
  if (score <= 4) return "#EF4444";
  return "#991B1B";
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

export function DiagnosisTab({
  tooth,
  selectedSurfaces,
  initialDiagnoses,
  initialPulpalStatus,
  patientRisk = "medio",
  onNavigateToTab,
  onDiagnosesChange,
  onPulpalStatusChange,
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
  const [vitalityTests, setVitalityTests] = useState<VitalityTest[]>([
    { type: "frio", result: "no-realizado" },
    { type: "calor", result: "no-realizado" },
    { type: "ept", result: "no-realizado" },
    { type: "percusion", result: "no-realizado" },
    { type: "palpacion", result: "no-realizado" },
  ]);
  const [painScore, setPainScore] = useState<number>(0);
  const [generalNotes, setGeneralNotes] = useState("");

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
  }, []);

  useEffect(() => {
    if (initialPulpalStatus) {
      setPulpalStatus(initialPulpalStatus);
    }
  }, []);

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

    if (typeof window !== "undefined") {
      (window as any).__currentDiagnoses = newMap;
    }

    if (onDiagnosesChange) {
      onDiagnosesChange(newMap);
    }
  };

  const handlePulpalStatusChange = (status: PulpalStatus) => {
    setPulpalStatus(status);
    if (typeof window !== "undefined") {
      (window as any).__currentPulpalStatus = status;
    }
    if (onPulpalStatusChange) {
      onPulpalStatusChange(status);
    }
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

    if (typeof window !== "undefined") {
      (window as any).__currentDiagnoses = newMap;
    }

    if (onDiagnosesChange) {
      onDiagnosesChange(newMap);
    }
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
  };

  const handleToggleLesion = (lesion: NonCariousLesion) => {
    setNonCariousLesions((prev) => {
      if (prev.includes(lesion)) {
        return prev.filter((l) => l !== lesion);
      } else {
        return [...prev, lesion];
      }
    });
  };

  const handleVitalityTestChange = (
    type: VitalityTestType,
    result: VitalityTestResult,
  ) => {
    setVitalityTests((prev) =>
      prev.map((test) => (test.type === type ? { ...test, result } : test)),
    );
  };

  const getRiskColor = (risk: PatientRiskLevel) => {
    if (risk === "bajo") return "bg-green-100 text-green-800 border-green-300";
    if (risk === "medio") return "bg-amber-100 text-amber-800 border-amber-300";
    return "bg-red-100 text-red-800 border-red-300";
  };

  const hasCoherenceIssue =
    (tooth.globalStatus === "absent" || tooth.globalStatus === "implant") &&
    Array.from(surfaceDiagnoses.values()).some((d) => d.icdasScore > 0);

  const hasMixedState =
    tooth.globalStatus === "crown" &&
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
            {getToothTypeName(tooth.number)} · {selectedSurfaces.length}{" "}
            superficie
            {selectedSurfaces.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className={getRiskColor(patientRisk)}>
            Riesgo: {patientRisk.charAt(0).toUpperCase() + patientRisk.slice(1)}
          </Badge>
          <Badge variant="outline" className="bg-muted">
            {GLOBAL_STATUS_LABELS[tooth.globalStatus]}
          </Badge>
        </div>
      </div>

      {hasCoherenceIssue && (
        <Card className="p-3 bg-red-50 border-red-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900">
                Revisa el estado del diente
              </p>
              <p className="text-xs text-red-700">
                El diente está marcado como{" "}
                {GLOBAL_STATUS_LABELS[tooth.globalStatus]} pero tiene
                diagnóstico de caries
              </p>
            </div>
          </div>
        </Card>
      )}

      {hasMixedState && (
        <Card className="p-3 bg-amber-50 border-amber-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900">
                Estado mixto detectado
              </p>
              <p className="text-xs text-amber-700">
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
                  <Checkbox
                    id={lesion}
                    checked={nonCariousLesions.includes(lesion)}
                    onCheckedChange={() => {
                      const newLesions = nonCariousLesions.includes(lesion)
                        ? nonCariousLesions.filter((l) => l !== lesion)
                        : [...nonCariousLesions, lesion];
                      setNonCariousLesions(newLesions);
                      saveDiagnosis({ nonCariousLesions: newLesions });
                    }}
                  />
                  <Label htmlFor={lesion} className="text-sm cursor-pointer">
                    {getLesionIcon(lesion)} {label}
                  </Label>
                </div>
              ))}
            </div>
            <div>
              <Label htmlFor="surface-notes" className="text-xs mb-1 block">
                Notas breves
              </Label>
              <Input
                id="surface-notes"
                value={surfaceNotes}
                onChange={(e) => setSurfaceNotes(e.target.value)}
                onBlur={saveDiagnosis}
                placeholder="Observaciones adicionales..."
                className="text-sm"
              />
            </div>
          </Card>

          {/* 2.4 Estado pulpar/periapical */}
          <Card className="p-4 shadow-sm">
            <Label className="text-sm font-semibold mb-3 block">
              Estado pulpar/periapical{" "}
              <Badge variant="outline">Nivel pieza</Badge>
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pulpal-status" className="text-xs mb-2 block">
                  Estado pulpar
                </Label>
                <Select
                  value={pulpalStatus}
                  onValueChange={handlePulpalStatusChange}
                >
                  <SelectTrigger id="pulpal-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      Object.entries(PULPAL_STATUS_LABELS) as [
                        PulpalStatus,
                        string,
                      ][]
                    ).map(([status, label]) => (
                      <SelectItem key={status} value={status}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label
                  htmlFor="periapical-status"
                  className="text-xs mb-2 block"
                >
                  Estado periapical
                </Label>
                <Select
                  value={periapicalStatus}
                  onValueChange={(value) =>
                    setPeriapicalStatus(value as PeriapicalStatus)
                  }
                >
                  <SelectTrigger id="periapical-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      Object.entries(PERIAPICAL_STATUS_LABELS) as [
                        PeriapicalStatus,
                        string,
                      ][]
                    ).map(([status, label]) => (
                      <SelectItem key={status} value={status}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* 2.5 Vitalidad y pruebas */}
          <Card className="p-4 shadow-sm">
            <Label className="text-sm font-semibold mb-3 block">
              Vitalidad y pruebas
            </Label>
            <div className="space-y-3">
              <div className="grid grid-cols-5 gap-2">
                {vitalityTests.map((test) => (
                  <div key={test.type} className="space-y-1">
                    <Label className="text-xs">
                      {VITALITY_TEST_LABELS[test.type]}
                    </Label>
                    <Select
                      value={test.result}
                      onValueChange={(value) =>
                        handleVitalityTestChange(
                          test.type,
                          value as VitalityTestResult,
                        )
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no-realizado">-</SelectItem>
                        <SelectItem value="positivo">+</SelectItem>
                        <SelectItem value="negativo">−</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="pain-score" className="text-xs mb-2 block">
                    Dolor (NRS 0-10)
                  </Label>
                  <Input
                    id="pain-score"
                    type="number"
                    min={0}
                    max={10}
                    value={painScore}
                    onChange={(e) => setPainScore(Number(e.target.value))}
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="general-notes" className="text-xs mb-2 block">
                    Notas generales
                  </Label>
                  <Input
                    id="general-notes"
                    value={generalNotes}
                    onChange={(e) => setGeneralNotes(e.target.value)}
                    placeholder="Observaciones..."
                    className="text-sm"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* 2.6 Evidencia */}
          <Card className="p-4 shadow-sm">
            <Label className="text-sm font-semibold mb-3 block">
              Evidencia
            </Label>
            <div className="border-2 border-dashed rounded-lg p-6 text-center text-muted-foreground hover:border-primary/50 transition-colors cursor-pointer">
              <Upload className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                Arrastra archivos aquí o haz clic para seleccionar
              </p>
              <p className="text-xs mt-1">
                Fotos intraorales, radiografías, etc.
              </p>
            </div>
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
                const color = diagnosis
                  ? getICDASColor(diagnosis.icdasScore)
                  : "#9ca3af";
                return (
                  <div
                    key={surface}
                    className="flex items-center justify-between p-2.5 rounded-lg border transition-all"
                    style={{
                      borderColor: color,
                      backgroundColor: `${color}15`,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold" style={{ color }}>
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
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg shadow-sm">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-red-900">
                        Endodoncia requerida
                      </p>
                      <p className="text-xs text-red-700 mt-1">
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
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg shadow-sm">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-red-900">
                        Restauración extensa / Onlay / Endo
                      </p>
                      <p className="text-xs text-red-700 mt-1">
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
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg shadow-sm">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-orange-900">
                        Resina (Plan)
                      </p>
                      <p className="text-xs text-orange-700 mt-1">
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
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg shadow-sm">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-amber-900">
                        Infiltración / Sellante
                      </p>
                      <p className="text-xs text-amber-700 mt-1">
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
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg shadow-sm">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-green-900">
                        Superficies sanas
                      </p>
                      <p className="text-xs text-green-700 mt-1">
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
                    className="w-4 h-4 rounded flex-shrink-0"
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
