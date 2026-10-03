import { Lock, WalletCards } from "lucide-react";
import { EmptyState } from "@/components/ui/atomic/feedback/empty-state";

/** "Módulo no disponible": la clínica no tiene Finanzas activo. */
export function FinanceModuleUnavailable() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl items-center">
      <EmptyState
        icon={WalletCards}
        variant="card"
        title="Módulo no disponible"
        description="Finanzas no está habilitado para esta clínica. Contacta a KodeWave para activarlo."
        className="w-full"
      />
    </div>
  );
}

/** El módulo está activo pero el usuario no tiene el permiso que pide la pantalla. */
export function FinanceNoPermission({ description }: { description?: string }) {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-xl items-center">
      <EmptyState
        icon={Lock}
        variant="card"
        title="No tienes permiso para esta acción"
        description={description ?? "Pide a un administrador que te asigne el permiso de Finanzas correspondiente."}
        className="w-full"
      />
    </div>
  );
}
