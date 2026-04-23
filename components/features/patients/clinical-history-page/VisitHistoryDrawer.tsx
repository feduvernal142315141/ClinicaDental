"use client";

import { useEffect, useState } from "react";
import { Drawer, Spin, Tag, Empty } from "antd";
import { FileText, Stethoscope, Paperclip } from "lucide-react";
import { useVisitRecord } from "@/lib/hooks/clinical-history";
import { useOdontogramByVisit } from "@/lib/hooks/odontogram/useOdontogramByVisit";
import { clinicalHistoryService } from "@/lib/services/clinical-history";
import type { Appointment } from "@/lib/entity/appointment/appointments";
import type { PatientAttachment } from "@/lib/entity/patientAttachment";

interface VisitHistoryDrawerProps {
  open: boolean;
  patientId: string;
  appointment: Appointment | null;
  onClose: () => void;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
      {children}
    </h4>
  );
}

export function VisitHistoryDrawer({
  open,
  patientId,
  appointment,
  onClose,
}: VisitHistoryDrawerProps) {
  const appointmentId = appointment?.id;

  const { record, loading } = useVisitRecord(patientId, appointmentId);
  const { snapshot: odontogramSnapshot, load: loadOdontogram } =
    useOdontogramByVisit(appointmentId);

  const [attachments, setAttachments] = useState<PatientAttachment[]>([]);

  // Load odontogram when appointment changes
  useEffect(() => {
    if (open && appointmentId) {
      loadOdontogram(appointmentId);
      clinicalHistoryService
        .getVisitAttachments(patientId, appointmentId)
        .then(setAttachments)
        .catch(() => setAttachments([]));
    }
  }, [open, appointmentId, patientId, loadOdontogram]);

  const pain = record?.currentPain;
  const hasPain =
    pain &&
    (pain.location || pain.intensity !== undefined || pain.type || pain.duration);

  return (
    <Drawer
      title={
        <div>
          <p className="font-semibold text-base">Historial de Visita</p>
          {appointment && (
            <p className="text-xs text-muted-foreground font-normal mt-0.5">
              {formatDate(appointment.date)}
              {appointment.time && ` · ${appointment.time}`}
            </p>
          )}
        </div>
      }
      open={open}
      onClose={onClose}
      size="large"
      destroyOnHidden
    >
      {loading ? (
        <div className="flex justify-center py-12">
          <Spin size="large" />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Header info */}
          <section className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                  Doctor
                </span>
                <span>
                  {appointment?.doctorName
                    ? `Dr. ${appointment.doctorName}`
                    : "No registrado"}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
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
            {hasPain ? (
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
                {record.clinicalNotesUpdatedAt && (
                  <p className="text-[10px] text-muted-foreground mt-2">
                    Actualizado{" "}
                    {new Date(record.clinicalNotesUpdatedAt).toLocaleString(
                      "es-ES",
                    )}
                    {record.clinicalNotesUpdatedBy &&
                      ` por ${record.clinicalNotesUpdatedBy}`}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground italic">Sin notas</p>
            )}
          </section>

          {/* Odontograma */}
          <section>
            <SectionTitle>
              <span className="flex items-center gap-2">
                <Stethoscope className="h-3 w-3" />
                Odontograma
              </span>
            </SectionTitle>
            {odontogramSnapshot ? (
              <div className="flex items-center gap-3">
                <Tag color="green">Odontograma guardado en esta visita</Tag>
                <button
                  onClick={onClose}
                  className="text-xs text-blue-500 hover:underline"
                >
                  Ver en pestaña Odontograma
                </button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Sin odontograma registrado para esta visita
              </p>
            )}
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
                  <li key={a.id} className="text-sm flex items-center gap-2">
                    <Paperclip className="h-3 w-3 text-muted-foreground" />
                    {a.fileName}
                    <span className="text-xs text-muted-foreground">
                      ({a.category})
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <span className="text-xs text-muted-foreground">
                    Sin archivos adjuntos para esta visita
                  </span>
                }
              />
            )}
          </section>
        </div>
      )}
    </Drawer>
  );
}
