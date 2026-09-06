"use client";

import { AlertTriangle, FileText, Loader2, Paperclip, Stethoscope } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/primitives/shadcn/sheet";
import { Badge } from "@/components/ui/atomic/data-display/badge";
import { OdontogramVisitComparison } from "@/components/features/patients/detail/OdontogramVisitComparison";
import { useVisitHistoryDrawer } from "@/lib/hooks/patients/clinical-history-page/use-visit-history-drawer";
import {
  NO_AUTHORSHIP_LABEL,
  resolveAuthorship,
} from "@/lib/utils/clinical-authorship";
import type { Appointment } from "@/lib/entity/appointment/appointments";
import { cn } from "@/lib/utils/utils";
import { SECTION_LABEL_CLASS } from "./section-label";

interface VisitHistoryDrawerProps {
  open: boolean;
  patientId: string;
  appointment: Appointment | null;
  clinicId?: string;
  onClose: () => void;
  onViewOdontogram?: (appointmentId: string) => void;
}

/**
 * Sello de la nota. Sólo se puede afirmar la ÚLTIMA EDICIÓN: el backend
 * sobreescribe la nota y no guarda versiones, así que aquí no hay autor, ni
 * firma, ni validación, ni historial.
 *
 * La fecha NO cuelga de que haya autor: `anonymous` (o un campo vacío) es
 * ausencia de constancia de autoría, no ausencia de edición, y la marca de
 * tiempo sigue siendo un dato real del registro. Y no se cae a `doctorName`: el
 * doctor de la cita es una asignación de agenda.
 */
function NoteStamp({
  updatedAt,
  updatedBy,
}: {
  updatedAt?: string;
  updatedBy?: string;
}) {
  const author = resolveAuthorship(updatedBy);
  const parsed = updatedAt ? new Date(updatedAt) : null;
  // Una cadena que el runtime no sabe parsear se muestra tal cual: "Invalid Date"
  // en un sello clínico es peor que el dato crudo.
  const stamp = parsed
    ? Number.isNaN(parsed.getTime())
      ? updatedAt
      : parsed.toLocaleString("es-ES")
    : null;
  if (!author && !stamp) return null;

  return (
    <p className="mt-2 text-[10px] text-subtle">
      {author ? (
        <>Última edición: {author}</>
      ) : (
        <span className="italic">{NO_AUTHORSHIP_LABEL}</span>
      )}
      {stamp ? ` · ${stamp}` : ""}
    </p>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className={cn(SECTION_LABEL_CLASS, "mb-2")}>
      {children}
    </h4>
  );
}

export function VisitHistoryDrawer({
  open,
  patientId,
  appointment,
  clinicId,
  onClose,
  onViewOdontogram,
}: VisitHistoryDrawerProps) {
  const {
    record,
    loading,
    attachments,
    attachmentsError,
    pain,
    hasPain,
    formattedVisitDate,
    odontogramSnapshots,
    hasOdontogram,
    handleViewOdontogram,
  } = useVisitHistoryDrawer({
    open,
    patientId,
    appointment,
    onClose,
    onViewOdontogram,
  });

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl bg-surface border-hairline flex flex-col gap-0 p-0"
      >
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-hairline">
          <SheetTitle className="text-ink text-base font-semibold">
            Historial de Visita
          </SheetTitle>
          <SheetDescription className="text-subtle">
            {appointment
              ? `${formattedVisitDate}${appointment.time ? ` · ${appointment.time}` : ""}`
              : "Detalle de la visita seleccionada."}
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="flex flex-1 justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-brand" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="flex flex-col gap-6">
              {/* Header info */}
              <section className="bg-hover rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    {/* "de la cita": es la asignación de AGENDA, no constancia
                        de quién atendió ni de quién escribió la nota. */}
                    <span className={cn(SECTION_LABEL_CLASS, "mb-1 block")}>
                      Doctor de la cita
                    </span>
                    <span>
                      {appointment?.doctorName
                        ? `Dr. ${appointment.doctorName}`
                        : "Sin doctor asignado"}
                    </span>
                  </div>
                  <div>
                    <span className={cn(SECTION_LABEL_CLASS, "mb-1 block")}>
                      Servicio
                    </span>
                    <span>
                      {appointment?.serviceName ?? appointment?.reason ?? "—"}
                    </span>
                  </div>
                </div>
              </section>

              {/* Motivo de consulta */}
              <section>
                <SectionTitle>Motivo de consulta</SectionTitle>
                <p className="text-sm text-foreground">
                  {record?.chiefComplaint || (
                    <span className="text-muted-foreground italic">
                      No registrado
                    </span>
                  )}
                </p>
              </section>

              {/* Dolor reportado */}
              <section>
                <SectionTitle>Dolor reportado</SectionTitle>
                {hasPain && pain ? (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {pain.location && (
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                          Ubicación
                        </span>
                        <p>{pain.location}</p>
                      </div>
                    )}
                    {pain.intensity !== undefined && (
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                          Intensidad
                        </span>
                        <p>{pain.intensity}/10</p>
                      </div>
                    )}
                    {pain.type && (
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                          Tipo
                        </span>
                        <p>{pain.type}</p>
                      </div>
                    )}
                    {pain.duration && (
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                          Duración
                        </span>
                        <p>{pain.duration}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Sin dolor registrado
                  </p>
                )}
              </section>

              {/* Anamnesis congelada al momento de la visita */}
              <section>
                <SectionTitle>Anamnesis (al momento de la visita)</SectionTitle>
                {record?.medicalSnapshot ? (
                  <div className="space-y-2 text-sm">
                    {(
                      [
                        ["Alergias", record.medicalSnapshot.allergies],
                        ["Medicación", record.medicalSnapshot.currentMedications],
                        ["Enfermedades", record.medicalSnapshot.systemicDiseases],
                        ["Cirugías", record.medicalSnapshot.previousSurgeries],
                        ["Hábitos", record.medicalSnapshot.habits],
                      ] as const
                    ).map(([label, items]) => (
                      <div key={label}>
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                          {label}
                        </span>
                        {items && items.length > 0 ? (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {items.map((it, idx) => (
                              <Badge key={`${label}-${idx}`} variant="outline">
                                {it}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="text-muted-foreground">—</p>
                        )}
                      </div>
                    ))}
                    {record.medicalSnapshot.capturedAt && (
                      <p className="text-[10px] text-muted-foreground">
                        Congelada el{" "}
                        {new Date(
                          record.medicalSnapshot.capturedAt,
                        ).toLocaleString("es-ES")}
                      </p>
                    )}
                  </div>
                ) : record ? (
                  <p className="text-sm text-muted-foreground italic">
                    Anamnesis no congelada para esta visita (previa al registro
                    por visita); ver datos actuales en Historia Clínica.
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Sin registro de visita.
                  </p>
                )}
              </section>

              {/* Notas del médico */}
              <section>
                <SectionTitle>
                  <span className="flex items-center gap-2">
                    <FileText className="h-3 w-3" />
                    Notas del médico
                  </span>
                </SectionTitle>
                {record?.clinicalNotes ? (
                  <>
                    <div
                      dangerouslySetInnerHTML={{ __html: record.clinicalNotes }}
                      className="prose prose-sm max-w-none"
                    />
                    <NoteStamp
                      updatedAt={record.clinicalNotesUpdatedAt}
                      updatedBy={record.clinicalNotesUpdatedBy}
                    />
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Sin notas
                  </p>
                )}
              </section>

              {/* Odontograma — comparativo antes/después de la visita */}
              <section>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <SectionTitle>
                    <span className="flex items-center gap-2">
                      <Stethoscope className="h-3 w-3" />
                      Odontograma · antes / después
                    </span>
                  </SectionTitle>
                  {hasOdontogram && (
                    <button
                      type="button"
                      onClick={handleViewOdontogram}
                      className="text-xs text-brand hover:underline"
                    >
                      Ver en pestaña Odontograma
                    </button>
                  )}
                </div>
                <OdontogramVisitComparison
                  patientId={patientId}
                  clinicId={clinicId}
                  snapshots={odontogramSnapshots}
                />
              </section>

              {/* Archivos adjuntos */}
              <section>
                <SectionTitle>
                  <span className="flex items-center gap-2">
                    <Paperclip className="h-3 w-3" />
                    Archivos adjuntos
                  </span>
                </SectionTitle>
                {attachments.length > 0 ? (
                  <ul className="flex flex-col gap-2">
                    {attachments.map((a) => (
                      <li
                        key={a.id}
                        className="text-sm flex items-center gap-2"
                      >
                        <Paperclip className="h-3 w-3 text-muted-foreground" />
                        {a.fileName}
                        <span className="text-xs text-muted-foreground">
                          ({a.category})
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : attachmentsError ? (
                  /* Tercer estado: la lectura falló. Decir "sin archivos" aquí
                     afirmaría que en esa visita no hubo radiografía ni
                     consentimiento — un hecho clínico que nadie ha comprobado
                     (ADR-61). */
                  <div className="flex flex-col items-center gap-1 py-6 text-center">
                    <AlertTriangle
                      className="h-5 w-5 text-subtle"
                      aria-hidden="true"
                    />
                    <p className="text-xs text-subtle">
                      No se pudieron cargar los archivos de esta visita
                    </p>
                    <p className="text-[11px] text-subtle">
                      Que no aparezca ninguno no significa que no los haya.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-center py-6">
                    <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center mb-2">
                      <Paperclip className="h-5 w-5 text-subtle" />
                    </div>
                    <p className="text-xs text-subtle">
                      Sin archivos adjuntos para esta visita
                    </p>
                  </div>
                )}
              </section>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
