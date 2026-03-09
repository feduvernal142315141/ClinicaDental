"use client"

import { OdontogramGrid } from "./odontogram-grid"
import { ToothModal } from "./tooth-modal"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { RotateCcw, FileText, Calendar } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useOdontogramModule, useEventFormatting } from "@/lib/odontogram/application/hooks"
import { useOdontogramStore } from "@/lib/odontogram/store"

interface OdontogramModuleProps {
  initialTab?: "odontogram" | "diagnosis" | "plans" | "performed"
}

export function OdontogramModule({
  initialTab = "odontogram",
}: OdontogramModuleProps) {
  const {
    teeth,
    selectedTooth,
    selectedSurface,
    isModalOpen,
    currentTooth,
    eventsByType,
    handlers,
  } = useOdontogramModule()
  const readOnly = useOdontogramStore((state) => state.readOnly)

  const { getEventBadgeColor, getEventTypeLabel, formatEventDate, getEventDisplayName } = useEventFormatting()

  const { diagnosis: diagnosisEvents, plan: planEvents, performed: performedEvents } = eventsByType

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Odontograma</h1>
          <p className="text-muted-foreground">Sistema de gestión dental profesional</p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={readOnly}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Limpiar Todo
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción eliminará todos los datos del odontograma, incluyendo diagnósticos, planes y eventos
                clínicos. Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handlers.handleClearAll} disabled={readOnly}>
                Sí, limpiar todo
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Tabs defaultValue={initialTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-3xl">
          <TabsTrigger value="odontogram">Odontograma</TabsTrigger>
          <TabsTrigger value="diagnosis">
            Diagnósticos
            {diagnosisEvents.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {diagnosisEvents.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="plans">
            Planes
            {planEvents.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {planEvents.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="performed">
            Realizados
            {performedEvents.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {performedEvents.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="odontogram" className="mt-6">
          <OdontogramGrid
            teeth={teeth}
            onSurfaceClick={handlers.handleSurfaceClick}
            onToothClick={handlers.handleToothClick}
          />
        </TabsContent>

        <TabsContent value="diagnosis" className="mt-6">
          <div className="space-y-4">
            {diagnosisEvents.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">No hay diagnósticos registrados</p>
                </CardContent>
              </Card>
            ) : (
              diagnosisEvents.map((event) => (
                <Card
                  key={event.id}
                  className="cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => handlers.handleEventClick(event)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">Diente {event.toothNumber}</CardTitle>
                        <CardDescription>
                          {event.surfaces.length > 0 && `Superficies: ${event.surfaces.join(", ")}`}
                        </CardDescription>
                      </div>
                      <Badge className={getEventBadgeColor(event.type)}>{getEventTypeLabel(event.type)}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="font-medium">{getEventDisplayName(event)}</p>
                      {event.notes && <p className="text-sm text-muted-foreground">{event.notes}</p>}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {formatEventDate(event.createdAt)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="plans" className="mt-6">
          <div className="space-y-4">
            {planEvents.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">No hay planes registrados</p>
                </CardContent>
              </Card>
            ) : (
              planEvents.map((event) => (
                <Card
                  key={event.id}
                  className="cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => handlers.handleEventClick(event)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">Diente {event.toothNumber}</CardTitle>
                        <CardDescription>
                          {event.surfaces.length > 0 && `Superficies: ${event.surfaces.join(", ")}`}
                        </CardDescription>
                      </div>
                      <Badge className={getEventBadgeColor(event.type)}>{getEventTypeLabel(event.type)}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="font-medium">{getEventDisplayName(event)}</p>
                      {event.notes && <p className="text-sm text-muted-foreground">{event.notes}</p>}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {formatEventDate(event.createdAt)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="performed" className="mt-6">
          <div className="space-y-4">
            {performedEvents.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">No hay procedimientos realizados</p>
                </CardContent>
              </Card>
            ) : (
              performedEvents.map((event) => (
                <Card
                  key={event.id}
                  className="cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => handlers.handleEventClick(event)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">Diente {event.toothNumber}</CardTitle>
                        <CardDescription>
                          {event.surfaces.length > 0 && `Superficies: ${event.surfaces.join(", ")}`}
                        </CardDescription>
                      </div>
                      <Badge className={getEventBadgeColor(event.type)}>{getEventTypeLabel(event.type)}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="font-medium">{getEventDisplayName(event)}</p>
                      {event.notes && <p className="text-sm text-muted-foreground">{event.notes}</p>}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {formatEventDate(event.createdAt)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      <ToothModal
        tooth={currentTooth}
        isOpen={isModalOpen}
        onClose={handlers.handleCloseModal}
        onUpdateGlobalStatus={handlers.updateToothGlobalStatus}
        onAddSurfaceTreatment={handlers.addSurfaceTreatment}
        onAddSurfaceCondition={handlers.addSurfaceCondition}
        onDeleteCondition={handlers.deleteSurfaceCondition}
        onCompleteTreatment={handlers.completeTreatment}
        onDeleteTreatment={handlers.deleteTreatment}
        onApplyAndNext={handlers.handleApplyAndNext}
        initialSurfaces={selectedSurface ? [selectedSurface] : undefined}
      />
    </div>
  )
}
