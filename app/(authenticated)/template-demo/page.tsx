"use client";

import { Header } from "@/components/ui/atomic/layout/header";
import { TemplateForm } from "@/components/template/template-form";

export default function TemplateDemoPage() {
  return (
    <div className="space-y-8">
      <Header
        level={1}
        title="Plantillas"
        description="Configura plantillas de mensajes para tus campañas"
        showSearch
        searchPlaceholder="Buscar plantillas..."
      />

      <TemplateForm />
    </div>
  );
}
