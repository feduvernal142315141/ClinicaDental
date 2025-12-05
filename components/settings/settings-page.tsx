"use client";

import { PageHeader } from "@/components/ui/atomic/layout/page-header";
import { TabsContainer } from "@/components/ui/atomic/navigation/tabs-container";
import { TabPanel } from "@/components/ui/atomic/navigation/tab-panel";
import {
  GeneralSettings,
  NotificationsSettings,
  IntegrationsSettings,
  DoctorsRolesSettings,
  PatientsPageClient,
} from "./lazy-settings-tabs";

const SETTINGS_TABS = [
  { value: "general", label: "Opciones Generales" },
  { value: "patients", label: "Gestión de Pacientes" },
  { value: "users", label: "Doctores y Roles" },
  { value: "notifications", label: "Notificaciones" },
  { value: "integrations", label: "Integraciones" },
];

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuración"
        description="Administra la configuración de tu clínica y personaliza el sistema según tus necesidades."
      />

      <TabsContainer defaultValue="general" tabs={SETTINGS_TABS}>
        <TabPanel value="general">
          <GeneralSettings />
        </TabPanel>

        <TabPanel value="patients">
          <PatientsPageClient />
        </TabPanel>

        <TabPanel value="users">
          <DoctorsRolesSettings />
        </TabPanel>

        <TabPanel value="notifications">
          <NotificationsSettings />
        </TabPanel>

        <TabPanel value="integrations">
          <IntegrationsSettings />
        </TabPanel>
      </TabsContainer>
    </div>
  );
}
