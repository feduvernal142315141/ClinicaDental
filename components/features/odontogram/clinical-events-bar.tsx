"use client"

import { useState, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Search, MoreVertical, Filter } from "lucide-react"
import type { ClinicalEvent, ClinicalEventStatus } from "./types"
import { getEventColor } from "./types"

interface ClinicalEventsBarProps {
  events: ClinicalEvent[]
  onEventClick: (event: ClinicalEvent) => void
  onMarkAsDone?: (eventId: string) => void
  onEdit?: (eventId: string) => void
  onViewHistory?: (toothNumber: number) => void
}

export function ClinicalEventsBar({
  events,
  onEventClick,
  onMarkAsDone,
  onEdit,
  onViewHistory,
}: ClinicalEventsBarProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<ClinicalEventStatus | "all">("all")
  const [showOverflow, setShowOverflow] = useState(false)

  const filteredEvents = useMemo(() => {
    let filtered = events

    // Filtrar por estado
    if (statusFilter !== "all") {
      filtered = filtered.filter((e) => e.status === statusFilter)
    }

    // Filtrar por búsqueda
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (e) =>
          e.toothNumber.toString().includes(query) ||
          e.procedureName?.toLowerCase().includes(query) ||
          e.surfaces.some((s) => s.toLowerCase().includes(query)),
      )
    }

    return filtered
  }, [events, statusFilter, searchQuery])

  const visibleEvents = showOverflow ? filteredEvents : filteredEvents.slice(0, 10)
  const overflowCount = filteredEvents.length - visibleEvents.length

  const getSurfaceLabel = (surface: string) => {
    const labels: Record<string, string> = {
      mesial: "M",
      distal: "D",
      facial: "B",
      lingual: "L",
      oclusal: "O",
    }
    return labels[surface] || surface[0].toUpperCase()
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg z-50">
      <div className="container mx-auto px-4 py-3">
        {/* Header con búsqueda y filtros */}
        <div className="flex items-center gap-3 mb-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar FDI o procedimiento..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                <Filter className="h-4 w-4" />
                {statusFilter === "all" ? "Todos" : statusFilter}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setStatusFilter("all")}>Todos</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("open")}>Pendientes (Rojo/Ámbar)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("done")}>Hecho (Azul)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("plan")}>Plan</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="text-sm text-muted-foreground">
            {filteredEvents.length} evento{filteredEvents.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Lista de chips */}
        <div className="flex items-center gap-2 flex-wrap">
          {visibleEvents.map((event) => (
            <Badge
              key={event.id}
              variant="outline"
              className="cursor-pointer hover:opacity-80 transition-opacity px-3 py-1.5 gap-2"
              style={{
                backgroundColor: getEventColor(event) + "20",
                borderColor: getEventColor(event),
                color: getEventColor(event),
              }}
              onClick={() => onEventClick(event)}
            >
              <span className="font-mono font-semibold">{event.toothNumber}</span>
              <span className="text-xs">·</span>
              <span className="text-xs">{event.surfaces.map(getSurfaceLabel).join(",")}</span>
              <span className="text-xs">·</span>
              <span className="text-xs">{event.procedureName || event.type}</span>
              <span className="text-xs">·</span>
              <span className="text-xs font-medium">{event.status}</span>

              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" className="h-4 w-4 p-0 ml-1">
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onEdit && <DropdownMenuItem onClick={() => onEdit(event.id)}>Editar</DropdownMenuItem>}
                  {onMarkAsDone && event.status === "plan" && (
                    <DropdownMenuItem onClick={() => onMarkAsDone(event.id)}>Marcar como Hecho</DropdownMenuItem>
                  )}
                  {onViewHistory && (
                    <DropdownMenuItem onClick={() => onViewHistory(event.toothNumber)}>
                      Ir a historial del diente
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </Badge>
          ))}

          {overflowCount > 0 && (
            <Button variant="outline" size="sm" onClick={() => setShowOverflow(!showOverflow)} className="gap-1">
              {showOverflow ? "Mostrar menos" : `+${overflowCount} más`}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
