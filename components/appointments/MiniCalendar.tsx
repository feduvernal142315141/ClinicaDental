"use client"

import { useState, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/atomic/data-display/card"
import { Button } from "@/components/ui/primitives/shadcn/button"
import { Appointment } from "@/lib/entity/appointment/appointments"
import { getAppointmentsByDate } from "@/lib/supabase/appointments"

interface MiniCalendarProps {
  doctorId?: string
  onDateSelect?: (date: string) => void
}

export function MiniCalendar({ doctorId, onDateSelect }: MiniCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  )
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [busyDates, setBusyDates] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!doctorId) return

    const fetchMonthAppointments = async () => {
      setLoading(true)
      try {
        const year = currentDate.getFullYear()
        const month = currentDate.getMonth()

        const busy = new Set<string>()

        for (let day = 1; day <= 31; day++) {
          const dateStr = [
            year,
            String(month + 1).padStart(2, "0"),
            String(day).padStart(2, "0"),
          ].join("-")

          const appts = await getAppointmentsByDate(dateStr, doctorId)
          if (appts.length > 0) busy.add(dateStr)
        }

        setBusyDates(busy)
      } catch (error) {
        console.error("Error cargando citas:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchMonthAppointments()
  }, [doctorId, currentDate])

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days: (Date | null)[] = []
    for (let i = 0; i < startingDayOfWeek; i++) days.push(null)
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }
    while (days.length < 42) {
      days.push(null)
    }
    return days
  }

  const days = getDaysInMonth(currentDate)
  const monthYear = currentDate.toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  })

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="capitalize text-lg">{monthYear}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2 text-xs">
          {["D", "L", "M", "X", "J", "V", "S"].map((d) => (
            <div key={d} className="text-center font-medium">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2 mt-2 text-center">
          {days.map((day, index) => {
            if (!day) {
              return (
                <div
                  key={index}
                  className="flex items-center justify-center h-8 w-8"
                />
              )
            }

            const dateStr = day.toISOString().split("T")[0]
            const isSelected = dateStr === selectedDate
            const isToday = dateStr === new Date().toISOString().split("T")[0]
            const isBusy = busyDates.has(dateStr)

            return (
              <div key={index} className="flex items-center justify-center">
                <Button
                  variant={isSelected ? "default" : "ghost"}
                  size="sm"
                  disabled={loading}
                  className={`h-8 w-8 aspect-square rounded-full p-0 text-sm
                    ${isBusy ? "bg-red-200 text-red-700" : "bg-green-100 text-green-800"}
                    ${isToday ? "ring-2 ring-primary" : ""}
                  `}
                  onClick={() => {
                    setSelectedDate(dateStr)
                    onDateSelect?.(dateStr)
                  }}
                >
                  {day.getDate()}
                </Button>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
