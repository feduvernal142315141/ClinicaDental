"use client";

import Link from "next/link";
import { AlertCircle, AlertTriangle, Loader2 } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Textarea,
} from "@/components/ui";
import { Select as SearchSelect } from "@/components/ui/controls/select";
import {
  LEAD_MATCHED_BY_LABELS,
  LEAD_SOURCES,
  LEAD_SOURCE_LABELS,
  LEAD_TEMPERATURES,
  LEAD_TEMPERATURE_LABELS,
  LEAD_UNCLASSIFIED_LABEL,
  leadDisplayName,
  type Lead,
  type LeadMatches,
  type LeadSource,
  type LeadTemperature,
} from "@/lib/entity/leads";
import { LEAD_NOTE_MAX, LEAD_PHONE_MAX, LEAD_SHORT_TEXT_MAX } from "@/lib/entity/leads/schemas";
import { useLeadPermissions, useLeadServiceOptions, useLeadUserOptions } from "@/lib/hooks/leads";
import { LEAD_VERSION_CONFLICT_MESSAGE, useLeadForm } from "@/lib/hooks/leads/use-lead-form";
import { notify } from "@/lib/utils/notify";
import { LeadStatusBadge } from "../shared/LeadBadges";

const NONE = "__none__";

interface LeadFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Con prospecto: edición. */
  lead?: Lead;
  onCreated?: (lead: Lead) => void;
}

/** Prospectos abiertos y pacientes que ya tienen ese teléfono o correo. */
function MatchList({ matches, onNavigate }: { matches: LeadMatches; onNavigate: () => void }) {
  return (
    <ul className="mt-2 space-y-1.5">
      {matches.openLeads.map((lead) => (
        <li key={lead.id} className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate font-medium">{leadDisplayName(lead)}</span>
            <LeadStatusBadge lead={lead} />
          </span>
          <Link href={`/leads/${lead.id}`} onClick={onNavigate} className="shrink-0 font-medium underline">
            Abrir el existente
          </Link>
        </li>
      ))}
      {matches.patients.map((patient) => (
        <li key={patient.patientId} className="flex flex-wrap items-center justify-between gap-2">
          <span className="min-w-0 truncate">
            <span className="font-medium">{patient.name ?? "Paciente"}</span>
            <span className="text-subtle"> · paciente · {LEAD_MATCHED_BY_LABELS[patient.matchedBy]?.toLowerCase()}</span>
          </span>
          <Link href={`/patients/${patient.patientId}`} onClick={onNavigate} className="shrink-0 font-medium underline">
            Ver paciente
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Alta manual y edición de un prospecto. */
export function LeadFormDialog({ open, onOpenChange, lead, onCreated }: LeadFormDialogProps) {
  const permissions = useLeadPermissions();
  const services = useLeadServiceOptions(open);
  const users = useLeadUserOptions(open);
  const {
    form,
    isEdit,
    submit,
    submitAllowingDuplicate,
    submitting,
    checkMatches,
    matches,
    duplicate,
    versionConflict,
  } = useLeadForm({
    open,
    lead,
    onSuccess: (saved, mode) => {
      if (mode === "created") {
        notify.success("Prospecto creado", { description: leadDisplayName(saved) });
        onCreated?.(saved);
      } else if (mode === "updated") {
        notify.success("Prospecto actualizado");
      }
      onOpenChange(false);
    },
  });

  const rootError = form.formState.errors.root?.message;
  const hasMatches = !!matches && matches.openLeads.length + matches.patients.length > 0;
  const close = () => onOpenChange(false);

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-bento border-hairline bg-surface sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-ink">{isEdit ? "Editar prospecto" : "Nuevo prospecto"}</DialogTitle>
          <DialogDescription className="text-subtle">
            {isEdit
              ? "Actualiza los datos de contacto, el interés y el detalle del origen. El origen en sí no se puede cambiar."
              : "Registra a una persona que todavía no es paciente. Basta con el nombre, el teléfono o el correo."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={submit} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input {...field} maxLength={LEAD_SHORT_TEXT_MAX} autoComplete="off" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="tel"
                        maxLength={LEAD_PHONE_MAX}
                        autoComplete="off"
                        onBlur={() => {
                          field.onBlur();
                          checkMatches();
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        maxLength={LEAD_SHORT_TEXT_MAX}
                        autoComplete="off"
                        onBlur={() => {
                          field.onBlur();
                          checkMatches();
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {!isEdit && hasMatches && !duplicate && matches && (
              <Alert variant="warning">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Ya existe alguien con ese dato</AlertTitle>
                <AlertDescription>
                  Revisa antes de guardar para no duplicar.
                  <MatchList matches={matches} onNavigate={close} />
                </AlertDescription>
              </Alert>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Origen</FormLabel>
                    <FormControl>
                      <SearchSelect
                        value={field.value}
                        onChange={(value) => field.onChange(value as LeadSource)}
                        options={LEAD_SOURCES.map((value) => ({ value, label: LEAD_SOURCE_LABELS[value] }))}
                        disabled={isEdit}
                        aria-label="Origen"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sourceDetail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Detalle del origen</FormLabel>
                    <FormControl>
                      <Input {...field} maxLength={LEAD_SHORT_TEXT_MAX} placeholder="Quién lo refirió, campaña…" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {isEdit && (
              <FormField
                control={form.control}
                name="sourceCampaign"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Campaña</FormLabel>
                    <FormControl>
                      <Input {...field} maxLength={LEAD_SHORT_TEXT_MAX} placeholder="Campaña de la que llegó" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="interestServiceId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Servicio de interés</FormLabel>
                    <FormControl>
                      <SearchSelect
                        value={field.value || NONE}
                        onChange={(value) => field.onChange(value === NONE ? "" : value)}
                        options={[
                          { value: NONE, label: "Sin definir" },
                          ...(services.data ?? []).map((service) => ({ value: service.id, label: service.name })),
                        ]}
                        searchable
                        searchPlaceholder="Buscar servicio…"
                        aria-label="Servicio de interés"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="temperature"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Temperatura</FormLabel>
                    <FormControl>
                      <SearchSelect
                        value={field.value || NONE}
                        onChange={(value) => field.onChange(value === NONE ? "" : (value as LeadTemperature))}
                        options={[
                          { value: NONE, label: LEAD_UNCLASSIFIED_LABEL },
                          ...LEAD_TEMPERATURES.map((value) => ({ value, label: LEAD_TEMPERATURE_LABELS[value] })),
                        ]}
                        aria-label="Temperatura"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="interestNote"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nota de interés</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} maxLength={LEAD_NOTE_MAX} placeholder="Qué busca la persona" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isEdit && (
              <>
                {permissions.canManage && (
                  <FormField
                    control={form.control}
                    name="assignedToUserId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Responsable</FormLabel>
                        <FormControl>
                          <SearchSelect
                            value={field.value || NONE}
                            onChange={(value) => field.onChange(value === NONE ? "" : value)}
                            options={[
                              { value: NONE, label: "Sin asignar" },
                              ...(users.data ?? []).map((user) => ({ value: user.id, label: user.name })),
                            ]}
                            searchable
                            searchPlaceholder="Buscar persona…"
                            aria-label="Responsable"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={form.control}
                  name="note"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nota inicial</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={2} maxLength={LEAD_NOTE_MAX} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {duplicate && (
              <Alert variant="warning">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Ya hay un prospecto abierto con ese teléfono o correo</AlertTitle>
                <AlertDescription>
                  Puedes abrir el existente o crear otro de todos modos.
                  <MatchList matches={duplicate} onNavigate={close} />
                </AlertDescription>
              </Alert>
            )}

            {versionConflict && (
              <Alert variant="destructive" role="alert">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{LEAD_VERSION_CONFLICT_MESSAGE}</AlertTitle>
                <AlertDescription>
                  Cargamos la versión más reciente y conservamos lo que escribiste. Revisa y guarda de nuevo.
                </AlertDescription>
              </Alert>
            )}

            {rootError && (
              <Alert variant="destructive" role="alert">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{rootError}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={close} disabled={submitting}>
                Cancelar
              </Button>
              {duplicate ? (
                <Button type="button" onClick={submitAllowingDuplicate} disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Crear de todos modos
                </Button>
              ) : (
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isEdit ? "Guardar cambios" : "Crear prospecto"}
                </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
