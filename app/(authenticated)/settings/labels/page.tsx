"use client";

import { useState, type ReactNode } from "react";
import { Pencil, Archive, Tags, Plus } from "lucide-react";
import { useLabels, useArchiveLabel } from "@/lib/hooks/labels";
import { LabelChip, LabelFormModal } from "@/components/app/labels";
import type { Label } from "@/lib/entity/label";
import { SectionTitle } from "@/components/ui/antd";
import { Button } from "@/components/ui/primitives/shadcn/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/primitives/shadcn/accordion";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/primitives/shadcn/alert-dialog";
import { cn } from "@/lib/utils/utils";

export default function LabelsSettingsPage() {
  const { labels, loading, refetch } = useLabels(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLabel, setEditingLabel] = useState<Label | undefined>(undefined);

  const active = labels.filter((l) => !l.isArchived);
  const archived = labels.filter((l) => l.isArchived);

  const handleNewLabel = () => {
    setEditingLabel(undefined);
    setModalOpen(true);
  };

  const handleEdit = (label: Label) => {
    setEditingLabel(label);
    setModalOpen(true);
  };

  return (
    <>
      <SectionTitle
        title="Etiquetas"
        subtitle="Administra las etiquetas para categorizar citas"
        actionButton={{
          label: "Nueva etiqueta",
          onClick: handleNewLabel,
          variant: "new",
        }}
      />

      {loading ? (
        <LabelGridSkeleton />
      ) : active.length === 0 && archived.length === 0 ? (
        <EmptyLabels onCreate={handleNewLabel} />
      ) : (
        <div className="space-y-8">
          {active.length === 0 ? (
            <div className="rounded-bento border border-dashed border-hairline bg-surface/50 p-10 text-center">
              <p className="text-sm text-subtle">
                No hay etiquetas activas. Crea una nueva para empezar a clasificar
                tus citas.
              </p>
            </div>
          ) : (
            <LabelGrid>
              {active.map((label) => (
                <LabelCard
                  key={label.id}
                  label={label}
                  onEdit={handleEdit}
                  onRefetch={refetch}
                />
              ))}
            </LabelGrid>
          )}

          {archived.length > 0 && (
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="archived" className="border-none">
                <AccordionTrigger className="py-2 text-sm font-medium text-subtle hover:text-ink hover:no-underline">
                  Archivadas ({archived.length})
                </AccordionTrigger>
                <AccordionContent className="pt-2">
                  <LabelGrid>
                    {archived.map((label) => (
                      <LabelCard
                        key={label.id}
                        label={label}
                        onEdit={handleEdit}
                        onRefetch={refetch}
                        isArchived
                      />
                    ))}
                  </LabelGrid>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </div>
      )}

      <LabelFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={refetch}
        label={editingLabel}
      />
    </>
  );
}

// ── Layout helpers ───────────────────────────────────────────────────────────

function LabelGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {children}
    </div>
  );
}

function LabelGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="bento flex flex-col gap-3 p-4" aria-hidden>
          <div className="h-6 w-28 animate-pulse rounded-full bg-hover" />
          <div className="h-3 w-full animate-pulse rounded bg-hover" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-hover" />
        </div>
      ))}
    </div>
  );
}

function EmptyLabels({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="bento flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand/10 text-brand">
        <Tags className="h-7 w-7" />
      </span>
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-ink">Aún no hay etiquetas</h3>
        <p className="mx-auto max-w-sm text-sm text-subtle">
          Crea tu primera etiqueta para clasificar y filtrar las citas por tipo,
          prioridad o estado.
        </p>
      </div>
      <Button type="primary" onClick={onCreate} icon={<Plus className="h-4 w-4" />}>
        Nueva etiqueta
      </Button>
    </div>
  );
}

// ── LabelCard ────────────────────────────────────────────────────────────────

function LabelCard({
  label,
  onEdit,
  onRefetch,
  isArchived = false,
}: {
  label: Label;
  onEdit: (l: Label) => void;
  onRefetch: () => void;
  isArchived?: boolean;
}) {
  const { archiveLabel, loading } = useArchiveLabel(label.id);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleArchive = () =>
    archiveLabel(() => {
      setConfirmOpen(false);
      onRefetch();
    });

  return (
    <article
      className={cn(
        "bento group relative flex h-full flex-col gap-3 overflow-hidden p-4",
        "transition-[transform,box-shadow] duration-200 ease-emphasized",
        isArchived
          ? "opacity-70"
          : "hover:-translate-y-0.5 hover:shadow-[0_14px_34px_-20px_rgba(16,24,40,0.5)]",
      )}
    >
      {/* Acento de color (identidad de la etiqueta sin romper la neutralidad Bento). */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-1"
        style={{ backgroundColor: label.color }}
      />

      <div className="flex items-start justify-between gap-2 pt-1">
        <LabelChip label={label} size="md" />

        {isArchived ? (
          <span className="shrink-0 rounded-full bg-hover px-2 py-0.5 text-[11px] font-medium text-subtle">
            Archivada
          </span>
        ) : (
          <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-200 focus-within:opacity-100 group-hover:opacity-100 [@media(pointer:coarse)]:opacity-100">
            <button
              type="button"
              onClick={() => onEdit(label)}
              title="Editar"
              aria-label={`Editar ${label.name}`}
              className="grid h-8 w-8 place-items-center rounded-lg text-subtle outline-none transition-colors hover:bg-hover hover:text-brand focus-visible:ring-2 focus-visible:ring-brand/45"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              title="Archivar"
              aria-label={`Archivar ${label.name}`}
              className="grid h-8 w-8 place-items-center rounded-lg text-subtle outline-none transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:ring-2 focus-visible:ring-destructive/40"
            >
              <Archive className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <p
        className={cn(
          "line-clamp-2 text-[13px] leading-relaxed",
          label.description ? "text-subtle" : "italic text-subtle/60",
        )}
      >
        {label.description || "Sin descripción"}
      </p>

      {!isArchived && (
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent className="border-hairline bg-surface">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-ink">
                ¿Archivar esta etiqueta?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-subtle">
                «{label.name}» dejará de estar disponible para nuevas citas. Las
                citas que ya la tienen conservan su etiqueta.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <Button
                variant="outline"
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="primary"
                danger
                loading={loading}
                onClick={handleArchive}
              >
                Archivar
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </article>
  );
}
