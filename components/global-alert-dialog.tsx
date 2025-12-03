"use client"

/**
 * ALERT DIALOG GLOBAL
 * 
 * Muestra alerts críticos controlados por el InterceptorContext.
 * Se usa para errores HTTP importantes (401, 403, 500, etc.)
 */

import { useAlerts } from '@/contexts/interceptor-context'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/primitives/shadcn/alert-dialog'
import { AlertCircle, AlertTriangle, Info } from 'lucide-react'

export function GlobalAlertDialog() {
  const { alertDialog, closeAlert } = useAlerts()

  // Seleccionar el ícono según el tipo
  const Icon = 
    alertDialog.type === 'error' ? AlertCircle :
    alertDialog.type === 'warning' ? AlertTriangle :
    Info

  // Color del ícono según el tipo
  const iconColor =
    alertDialog.type === 'error' ? 'text-red-600' :
    alertDialog.type === 'warning' ? 'text-yellow-600' :
    'text-blue-600'

  return (
    <AlertDialog open={alertDialog.isOpen} onOpenChange={closeAlert}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <Icon className={`h-6 w-6 ${iconColor}`} />
            <AlertDialogTitle>{alertDialog.title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            {alertDialog.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={closeAlert}>
            Entendido
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

