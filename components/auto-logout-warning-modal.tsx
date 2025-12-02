'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface AutoLogoutWarningModalProps {
  isOpen: boolean
  onContinue: () => void
  onLogout: () => void
  warningMessage?: string
}

/**
 * Modal de advertencia antes del auto-logout
 * Se muestra cuando el usuario ha estado inactivo por un tiempo prolongado
 */
export function AutoLogoutWarningModal({
  isOpen,
  onContinue,
  onLogout,
  warningMessage = 'Tu sesión está por expirar debido a inactividad. ¿Deseas continuar en el sistema?',
}: AutoLogoutWarningModalProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onLogout()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <span className="text-2xl">⚠️</span>
            Advertencia de Inactividad
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base pt-2">
            {warningMessage}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel 
            onClick={onLogout}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Cerrar Sesión
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onContinue}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Continuar Trabajando
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

