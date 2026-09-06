"use client";

import { useState } from "react";
import { Loader2, Paperclip, FileX2, Plus, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { usePatientAttachments } from "@/lib/hooks/patientAttachments/usePatientAttachments";
import { ATTACHMENT_CATEGORIES, type AttachmentCategory } from "@/lib/entity/patientAttachment";
import { notify } from "@/lib/utils/notify";
import { AttachmentCard } from "./AttachmentCard";
import { AttachmentUploadModal } from "./AttachmentUploadModal";

interface PatientAttachmentsSectionProps {
  patientId: string;
  canUpload: boolean;
  canDelete: boolean;
  activeAppointmentId?: string;
}

export function PatientAttachmentsSection({
  patientId,
  canUpload,
  canDelete,
  activeAppointmentId,
}: PatientAttachmentsSectionProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const { attachments, loading, uploading, error, forbidden, load, upload, remove } =
    usePatientAttachments(patientId);

  const handleUpload = async (file: File, category: AttachmentCategory, notes?: string) => {
    try {
      await upload(file, category, notes, activeAppointmentId);
      void notify.success("Archivo subido", {
        description: "El adjunto ya está disponible en la ficha del paciente.",
      });
    } catch {
      void notify.error("No se pudo subir el archivo", {
        description:
          "Revisa tu conexión y el tamaño del archivo, e inténtalo de nuevo; si persiste, contacta a soporte.",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await remove(id);
      void notify.success("Archivo eliminado", {
        description: "El adjunto ya no aparece en la ficha del paciente.",
      });
    } catch {
      void notify.error("No se pudo eliminar el archivo", {
        description:
          "Revisa tu conexión e inténtalo de nuevo; si el problema persiste, contacta a soporte.",
      });
    }
  };

  // Agrupar por categoría (solo las que tienen ítems)
  const grouped = ATTACHMENT_CATEGORIES.map((cat) => ({
    ...cat,
    items: attachments.filter((a) => a.category === cat.value),
  })).filter((g) => g.items.length > 0);

  // Con `error`, una lista no vacía es la ÚLTIMA lectura correcta, no el estado
  // actual del paciente. Sin distinguirlo, tras una subida cuya recarga falla el
  // usuario leía "que aquí no aparezca ninguno..." junto a una lista que sí
  // aparece y a la que le falta justo el archivo que acaba de subir.
  const showingStaleList = Boolean(error) && attachments.length > 0;

  const attachmentsList = (
    <div className="space-y-3">
      {grouped.map((group) => (
        <div key={group.value} className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-wide text-subtle">
            {group.label}
          </p>
          {group.items.map((attachment) => (
            <AttachmentCard
              key={attachment.id}
              attachment={attachment}
              patientId={patientId}
              onDelete={handleDelete}
              canDelete={canDelete}
            />
          ))}
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-2">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm font-medium text-ink">
          <Paperclip className="h-4 w-4" />
          <span>Archivos</span>
          {attachments.length > 0 && (
            <span className="rounded-full bg-elevated px-1.5 py-0.5 text-xs text-subtle">
              {attachments.length}
            </span>
          )}
        </div>
        {canUpload && (
          <Button
            variant="ghost"
            size="sm"
            type="button"
            className="h-7 gap-1 px-2 text-xs"
            onClick={() => setModalOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Agregar
          </Button>
        )}
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="flex justify-center py-4" aria-label="Cargando archivos...">
          <Loader2 className="h-4 w-4 animate-spin text-brand" />
        </div>
      ) : error ? (
        /* Un fallo de lectura NO es "sin archivos adjuntos". La rama vacía de
           abajo AFIRMA que este paciente no tiene consentimientos ni
           radiografías, y esa afirmación no puede nacer de una lectura que
           falló (ADR-61). El toast del hook se desvanece; este bloque no. */
        <div className="space-y-3">
          <Alert live={false}>
            <AlertTriangle />
            <AlertTitle>
              {/* Tres títulos, no dos: "cargar" es falso cuando ya hay archivos
                  en pantalla (lo que falló es la RELECTURA), y "no se pudo leer"
                  es falso ante un 403, donde el servidor respondió perfectamente
                  y lo que falta es permiso. */}
              {forbidden
                ? "Sin acceso a los archivos"
                : showingStaleList
                  ? "No se pudieron actualizar los archivos"
                  : "No se pudieron cargar los archivos"}
            </AlertTitle>
            <AlertDescription className="flex flex-col items-start gap-2">
              {/* Dos avisos porque el usuario ve dos pantallas distintas: sin
                  lista el riesgo es creer que el paciente no tiene archivos; con
                  lista, creerla completa y al día. */}
              <span>
                {forbidden
                  ? "Tu rol no permite ver los archivos adjuntos de este paciente. Que aquí no aparezca ninguno NO significa que no los tenga: pídeselos a quien sí tenga acceso antes de un procedimiento."
                  : showingStaleList
                    ? "No hemos podido releer los archivos de este paciente. Lo que ves abajo es la última lectura correcta y puede estar desactualizada: si acabas de subir un archivo, puede que todavía no aparezca. No des la lista por completa antes de un procedimiento."
                    : "No hemos podido leer los archivos adjuntos de este paciente. Que aquí no aparezca ninguno NO significa que el paciente no tenga archivos: no lo des por hecho antes de un procedimiento."}
              </span>
              <span className="text-xs text-subtle">Detalle: {error}</span>
              {/* Reintentar solo donde puede funcionar: sobre un 403 el botón es
                  un generador de modales de "Acceso denegado", y afirma que el
                  problema es transitorio cuando es determinista. */}
              {!forbidden && (
                <Button variant="outline" size="sm" type="button" onClick={() => void load()}>
                  Reintentar
                </Button>
              )}
            </AlertDescription>
          </Alert>
          {/* Lo ya leído en una carga anterior SÍ existe: se mantiene visible
              bajo el aviso en vez de esconder un consentimiento real. */}
          {showingStaleList && attachmentsList}
        </div>
      ) : attachments.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-hairline py-6 text-center">
          <FileX2 className="h-6 w-6 text-subtle" />
          <p className="text-xs text-subtle">Sin archivos adjuntos</p>
          {canUpload && (
            <Button
              variant="outline"
              size="sm"
              type="button"
              className="h-7 gap-1 px-3 text-xs"
              onClick={() => setModalOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Subir primer archivo
            </Button>
          )}
        </div>
      ) : (
        attachmentsList
      )}

      <AttachmentUploadModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onUpload={handleUpload}
        uploading={uploading}
        appointmentId={activeAppointmentId}
      />
    </div>
  );
}
