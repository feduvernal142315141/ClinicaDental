"use client"

import { useState, useMemo } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { PanelRightOpen, ChevronDown, ChevronRight } from "lucide-react"
import type { ClinicalEvent, ProcedurePriority } from "./types"
import { getEventColor } from "./types"

interface VisitDrawerProps {
  events: ClinicalEvent[]
  onEventClick: (event: ClinicalEvent) => void
  onChangePriority?: (eventId: string, priority: ProcedurePriority) => void
  onMarkAsDone?: (eventId: string) => void
}

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
export function VisitDrawer({ events, onEventClick, onChangePriority, onMarkAsDone }: VisitDrawerProps) {
  const [expandedTeeth, setExpandedTeeth] = useState<Set<number>>(new Set())

  // Agrupar eventos por diente
  const eventsByTooth = useMemo(() => {
    const grouped = new Map<number, ClinicalEvent[]>()
    events.forEach((event) => {
      if (!grouped.has(event.toothNumber)) {
        grouped.set(event.toothNumber, [])
      }
      grouped.get(event.toothNumber)!.push(event)
    })

    // Ordenar por prioridad y FDI
    return Array.from(grouped.entries())
      .sort(([a], [b]) => a - b)
      .map(([toothNumber, events]) => ({
        toothNumber,
        events: events.sort((a, b) => {
          const priorityOrder = { alta: 0, media: 1, baja: 2 }
          const aPriority = a.priority ? priorityOrder[a.priority] : 3
          const bPriority = b.priority ? priorityOrder[b.priority] : 3
          return aPriority - bPriority
        }),
      }))
  }, [events])

  const toggleTooth = (toothNumber: number) => {
    setExpandedTeeth((prev) => {
      const next = new Set(prev)
      if (next.has(toothNumber)) {
        next.delete(toothNumber)
      } else {
        next.add(toothNumber)
      }
      return next
    })
  }

  const getCountByStatus = (events: ClinicalEvent[]) => {
    const counts = { red: 0, amber: 0, blue: 0 }
    events.forEach((e) => {
      if (e.status === "done") counts.blue++
      else if (e.status === "plan") counts.amber++
      else if (e.type === "diagnosis") counts.red++
    })
    return counts
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="fixed right-4 top-20 z-40 gap-2 bg-transparent">
          <PanelRightOpen className="h-4 w-4" />
          Bandeja de visita
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[400px] sm:w-[540px] bg-surface border-hairline">
        <SheetHeader>
          <SheetTitle className="text-ink">Bandeja de visita</SheetTitle>
          <SheetDescription className="text-subtle">
            Procedimientos y diagnósticos agrupados por diente.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-8rem)] mt-6">
          <div className="space-y-2">
            {eventsByTooth.map(({ toothNumber, events }) => {
              const isExpanded = expandedTeeth.has(toothNumber)
              const counts = getCountByStatus(events)

              return (
                <div key={toothNumber} className="border border-hairline rounded-lg bg-surface">
                  <button
                    type="button"
                    onClick={() => toggleTooth(toothNumber)}
                    className="w-full flex items-center justify-between p-3 hover:bg-hover transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? <ChevronDown className="h-4 w-4 text-subtle" /> : <ChevronRight className="h-4 w-4 text-subtle" />}
                      <span className="font-mono font-semibold text-lg text-ink">{toothNumber}</span>
                      <div className="flex items-center gap-1">
                        {counts.red > 0 && (
                          <Badge
                            variant="outline"
                            className="h-5 px-1.5 text-xs bg-rose-500/15 text-rose-600 border-rose-400/25 dark:text-rose-300"
                          >
                            🔴 {counts.red}
                          </Badge>
                        )}
                        {counts.amber > 0 && (
                          <Badge
                            variant="outline"
                            className="h-5 px-1.5 text-xs bg-amber-500/15 text-amber-600 border-amber-400/25 dark:text-amber-300"
                          >
                            🟧 {counts.amber}
                          </Badge>
                        )}
                        {counts.blue > 0 && (
                          <Badge
                            variant="outline"
                            className="h-5 px-1.5 text-xs bg-sky-500/15 text-sky-600 border-sky-400/25 dark:text-sky-300"
                          >
                            🔵 {counts.blue}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <span className="text-sm text-subtle">{events.length} eventos</span>
                  </button>

                  {isExpanded && (
                    <div className="p-3 pt-0 space-y-2">
                      {events.map((event) => (
                        <div
                          key={event.id}
                          className="border border-hairline rounded p-2 cursor-pointer hover:bg-hover transition-colors"
                          style={{ borderLeftWidth: 3, borderLeftColor: getEventColor(event) }}
                          onClick={() => onEventClick(event)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate text-ink">{event.procedureName || event.type}</div>
                              <div className="text-xs text-subtle mt-0.5">
                                {event.surfaces.map((s) => s[0].toUpperCase()).join(", ")}
                              </div>
                            </div>
                            <Badge variant="outline" className="text-xs shrink-0">
                              {event.status}
                            </Badge>
                          </div>

                          {event.notes && (
                            <div className="text-xs text-subtle mt-1 line-clamp-1">{event.notes}</div>
                          )}

                          <div className="flex items-center gap-2 mt-2">
                            {onMarkAsDone && event.status === "plan" && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-6 text-xs bg-transparent"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onMarkAsDone(event.id)
                                }}
                              >
                                Marcar Hecho
                              </Button>
                            )}
                            {event.priority && (
                              <Badge variant="outline" className="h-6 text-xs">
                                {event.priority}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
