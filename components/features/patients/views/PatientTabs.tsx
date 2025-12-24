"use client";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/primitives/shadcn/tabs";
import { Odontogram } from "@/components/odontogram/Odontogram";

export function PatientTabs() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gestión de Pacientes</h1>
        <p className="text-muted-foreground">
          Administra la información de los pacientes
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">Datos Personales</TabsTrigger>
          <TabsTrigger value="odontogram">Odontograma</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4"></TabsContent>

        <TabsContent value="odontogram" className="space-y-4">
          <Odontogram onChange={(data) => console.log("Odontograma:", data)} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
