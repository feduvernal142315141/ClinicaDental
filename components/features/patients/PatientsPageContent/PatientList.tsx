"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  Users,
  SearchX,
  AlertTriangle,
  RefreshCw,
  Plus,
} from "lucide-react";
import { DataTable } from "@/components/ui/data-display/data-table";
import { AlertDialog } from "@/components/ui/atomic/feedback/alert-dialog/alert-dialog";
import { Button } from "@/components/ui/primitives/shadcn/button";
import {
  usePatients,
  usePatientsPage,
  usePatientFilters,
} from "@/lib/hooks/patients";
import { usePermission } from "@/lib/hooks/use-permission";
import { PermissionAction } from "@/lib/permissions/permission-actions";
import { getPatientsColumns } from "../columns/patients-table.config";
import { PatientSearchBar } from "./PatientSearchBar";
import { patientsQuery, type PatientField } from "@/lib/query/domains/patients";
import { useI18n } from "@/lib/contexts/i18n-context";
import type { Patient } from "@/lib/entity/patients";

interface PatientListProps {
  /** Base path for navigation */
  basePath?: string;
}

/**
 * Patients List Component
 *
 * Displays a paginated table of patients with search, filters, sort, and
 * permission-gated actions. Replaces antd modal.confirm with a Bento AlertDialog.
 *
 * @example
 * <PatientList basePath="/patients" />
 */
export function PatientList({ basePath = "/patients" }: PatientListProps) {
  const { t } = useI18n();
  const { isAdmin, can } = usePermission();
  const canCreate = isAdmin || can("patients", PermissionAction.CREATE);
  const canEdit = isAdmin || can("patients", PermissionAction.EDIT);

  const { handleNewPatient, handleViewPatient, handleEditPatient } =
    usePatientsPage({ basePath });

  const {
    patients,
    loading,
    fetchError,
    pagination,
    fetchPatients,
    deletePatient,
    activatePatient,
  } = usePatients();

  // ── Confirm dialog state ─────────────────────────────────────────────────
  const [confirmDialog, setConfirmDialog] = useState<{
    type: "deactivate" | "activate";
    patient: Patient;
  } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // ── Persistent refs (survive re-renders without causing them) ────────────
  // Fase 2 (GET semántico): la búsqueda viaja como intención plana `q`
  // (el backend barre name + email). El orden sigue por la ruta estructurada
  // (`orders`) durante la coexistencia.
  const qRef = useRef<string>("");
  const activeOrdersRef = useRef<string[]>([]);
  const pageSizeRef = useRef(10);
  pageSizeRef.current = pagination.pageSize;

  // ── Search (semantic intent) ─────────────────────────────────────────────
  const handleFiltersChange = useCallback(
    ({ q }: { q: string }) => {
      qRef.current = q;
      const filters = q ? patientsQuery().search(q).build().filters : [];
      fetchPatients({
        page: 0,
        pageSize: pageSizeRef.current,
        filters,
        orders: activeOrdersRef.current,
      }).catch(() => {
        /* toast already shown by hook */
      });
    },
    [fetchPatients],
  );

  const { search, setSearch, hasActiveFilters } =
    usePatientFilters(handleFiltersChange);

  // ── Initial load ─────────────────────────────────────────────────────────
  useEffect(() => {
    fetchPatients({ page: 0, pageSize: 10 }).catch(() => {
      /* toast already shown by hook */
    });
  }, [fetchPatients]);

  // ── Sort ─────────────────────────────────────────────────────────────────
  // patientsQuery().order() emits the canonical backend format "field__ASC" / "field__DESC".
  const handleSortChange = useCallback(
    (field: string, order: "asc" | "desc" | null) => {
      const orders = order
        ? patientsQuery().order(field as PatientField, order).build().orders
        : [];
      activeOrdersRef.current = orders;
      const filters = qRef.current ? patientsQuery().search(qRef.current).build().filters : [];
      fetchPatients({
        page: 0,
        pageSize: pageSizeRef.current,
        filters,
        orders,
      }).catch(() => {
        /* toast already shown by hook */
      });
    },
    [fetchPatients],
  );

  // ── Action requests (open dialogs) ───────────────────────────────────────
  const handleDeactivateRequest = useCallback((patient: Patient) => {
    setConfirmDialog({ type: "deactivate", patient });
  }, []);

  const handleActivateRequest = useCallback((patient: Patient) => {
    setConfirmDialog({ type: "activate", patient });
  }, []);

  // ── Confirm action ───────────────────────────────────────────────────────
  const handleConfirm = useCallback(async () => {
    if (!confirmDialog) return;
    setConfirmLoading(true);
    try {
      if (confirmDialog.type === "deactivate") {
        await deletePatient(confirmDialog.patient.id);
      } else {
        await activatePatient(confirmDialog.patient.id);
      }
      setConfirmDialog(null);
      const filters = qRef.current ? patientsQuery().search(qRef.current).build().filters : [];
      await fetchPatients({
        page: pagination.page,
        pageSize: pagination.pageSize,
        filters,
        orders: activeOrdersRef.current,
      });
    } catch {
      /* toasts already shown by hook */
    } finally {
      setConfirmLoading(false);
    }
  }, [
    confirmDialog,
    deletePatient,
    activatePatient,
    fetchPatients,
    pagination.page,
    pagination.pageSize,
  ]);

  // ── Columns ──────────────────────────────────────────────────────────────
  const columns = useMemo(
    () =>
      getPatientsColumns({
        onView: handleViewPatient,
        onEdit: handleEditPatient,
        onDelete: handleDeactivateRequest,
        onToggleStatus: handleActivateRequest,
        canEdit,
        labels: {
          patient: t("patients.table.patient"),
          age: t("patients.table.age"),
          contact: t("patients.table.contact"),
          address: t("patients.table.address"),
          status: t("patients.table.status"),
          actions: t("patients.table.actions"),
          active: t("patients.table.active"),
          inactive: t("patients.table.inactive"),
          years: t("patients.table.years"),
          months: t("patients.table.months"),
          ageJoiner: t("patients.table.ageJoiner"),
          viewHistory: t("patients.table.viewHistory"),
          editPatient: t("patients.table.editPatient"),
          moreActions: t("patients.table.moreActions"),
          deactivate: t("patients.actions.deactivate"),
          activate: t("patients.actions.activate"),
        },
      }),
    [
      handleViewPatient,
      handleEditPatient,
      handleDeactivateRequest,
      handleActivateRequest,
      canEdit,
      t,
    ],
  );

  // ── Differentiated empty states ──────────────────────────────────────────
  const emptyContent = fetchError ? (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <div className="rounded-full bg-rose-50 p-3">
        <AlertTriangle className="h-6 w-6 text-rose-500" />
      </div>
      <p className="text-sm font-semibold text-ink">
        {t("patients.list.loadErrorTitle")}
      </p>
      <p className="max-w-xs text-xs text-subtle">
        {t("patients.list.loadErrorDescription")}
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          const filters = qRef.current ? patientsQuery().search(qRef.current).build().filters : [];
          fetchPatients({
            page: 0,
            pageSize: pageSizeRef.current,
            filters,
            orders: activeOrdersRef.current,
          }).catch(() => {})
        }}
        className="mt-1 gap-2"
      >
        <RefreshCw className="h-4 w-4" />
        {t("patients.actions.retry")}
      </Button>
    </div>
  ) : hasActiveFilters ? (
    <div className="flex flex-col items-center gap-2 py-12 text-center">
      <div className="rounded-full bg-hover p-3">
        <SearchX className="h-6 w-6 text-subtle" />
      </div>
      <p className="text-sm font-semibold text-ink">
        {t("patients.list.noResultsTitle")}
      </p>
      <p className="max-w-xs text-xs text-subtle">
        {t("patients.list.noResultsBefore")} &ldquo;{search}&rdquo;.{" "}
        {t("patients.list.noResultsAfter")}
      </p>
    </div>
  ) : (
    <div className="flex flex-col items-center gap-2 py-12 text-center">
      <div className="rounded-full bg-hover p-3">
        <Users className="h-6 w-6 text-subtle" />
      </div>
      <p className="text-sm font-semibold text-ink">
        {t("patients.list.emptyTitle")}
      </p>
      <p className="max-w-xs text-xs text-subtle">
        {t("patients.list.emptyDescription")}
      </p>
      {canCreate && (
        <Button size="sm" onClick={handleNewPatient} className="mt-2 gap-2">
          <Plus className="h-4 w-4" />
          {t("patients.actions.new")}
        </Button>
      )}
    </div>
  );

  // ── Confirm dialog content ───────────────────────────────────────────────
  const isDeactivate = confirmDialog?.type === "deactivate";
  const patientName = confirmDialog?.patient.name ?? "";

  return (
    <section className="bento space-y-4 p-4 lg:p-5">
      <PatientSearchBar value={search} onChange={setSearch} loading={loading} />

      <DataTable
        columns={columns}
        data={patients}
        loading={loading}
        rowKey="id"
        page={Math.max(pagination.page + 1, 1)}
        pageSize={pagination.pageSize}
        total={pagination.total}
        showSizeChanger
        onPageChange={(page, pageSize) => {
          const filters = qRef.current ? patientsQuery().search(qRef.current).build().filters : [];
          fetchPatients({
            page: page - 1,
            pageSize,
            filters,
            orders: activeOrdersRef.current,
          }).catch(() => {});
        }}
        onSortChange={handleSortChange}
        emptyText={emptyContent}
      />

      {/* Confirmation dialog for deactivate / activate */}
      <AlertDialog
        open={!!confirmDialog}
        onOpenChange={(open) => {
          if (!open && !confirmLoading) setConfirmDialog(null);
        }}
        variant={isDeactivate ? "error" : "warning"}
        title={
          isDeactivate
            ? t("patients.dialog.deactivateTitle")
            : t("patients.dialog.activateTitle")
        }
        description={
          isDeactivate
            ? `${t("patients.dialog.deactivateBefore")} ${patientName} ${t("patients.dialog.deactivateAfter")}`
            : `${t("patients.dialog.activateBefore")} ${patientName} ${t("patients.dialog.activateAfter")}`
        }
        actions={[
          {
            label: t("patients.actions.cancel"),
            onClick: () => setConfirmDialog(null),
            variant: "outline",
            disabled: confirmLoading,
          },
          {
            label: isDeactivate
              ? t("patients.actions.deactivate")
              : t("patients.actions.activate"),
            onClick: () => {
              void handleConfirm();
            },
            variant: isDeactivate ? "destructive" : "default",
            disabled: confirmLoading,
            // Keep dialog open while the async operation runs
            autoClose: false,
          },
        ]}
      />
    </section>
  );
}
