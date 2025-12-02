"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Plus, User } from "lucide-react"
import type { Doctor } from "@/lib/doctors"
import DoctorCard from "./DoctorCard"
import { DoctorForm } from "./DoctorForm"
import { Modal } from "@/components/ui/Modal"

export default function DoctorsList({
  doctors,
  reload,
}: {
  doctors: Doctor[]
  reload: () => void
}) {
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
  const [isAddingDoctor, setIsAddingDoctor] = useState(false)

  const isOpen = isAddingDoctor || !!selectedDoctor

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Gestión de Doctores</h3>
          <p className="text-sm text-muted-foreground">
            Administra los doctores de tu clínica y sus horarios de atención
          </p>
        </div>

        <Button onClick={() => setIsAddingDoctor(true)} className="cursor-pointer">
          <Plus className="h-4 w-4 mr-2" /> Agregar Doctor
        </Button>
      </div>

      <Modal
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedDoctor(null)
            setIsAddingDoctor(false)
          }
        }}
        title={selectedDoctor ? "Editar Doctor" : "Agregar Doctor"}
        className="w-full sm:max-w-3xl lg:max-w-5xl max-h-[90vh] overflow-y-auto"
      >
        <DoctorForm
          doctor={selectedDoctor}
          onSuccess={() => {
            setSelectedDoctor(null)
            setIsAddingDoctor(false)
            reload()
          }}
          onCancel={() => {
            setSelectedDoctor(null)
            setIsAddingDoctor(false)
          }}
        />
      </Modal>

      {doctors.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-12 text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
            <User className="h-8 w-8 text-muted-foreground" />
          </div>
          <h4 className="text-lg font-semibold">No hay doctores registrados</h4>
          <p className="text-sm text-muted-foreground max-w-md">
            Aún no has agregado ningún doctor a tu clínica. Agrega tu primer
            doctor para empezar a gestionar sus horarios y citas.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {doctors.map((doctor) => (
            <DoctorCard
              key={doctor.id}
              doctor={doctor}
              onEdit={setSelectedDoctor}
              reload={reload}
            />
          ))}
        </div>
      )}
    </div>
  )
}
