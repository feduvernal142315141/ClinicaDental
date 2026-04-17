"use client";

import { Header } from "@/components/ui/atomic/layout/header";
import { Card, CardContent } from "@/components/ui/atomic/data-display/card";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { Mail, MessageCircle, Phone, FileText } from "lucide-react";

export default function SupportPage() {
  return (
    <div className="space-y-8">
      <Header
        level={1}
        title="Soporte"
        // description="Obtén ayuda y contacta con nuestro equipo de soporte"
        showSearch
        searchPlaceholder="Buscar en soporte..."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact Cards */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">Email</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Envíanos un correo y te responderemos en 24 horas
                </p>
                <Button variant="outline" size="sm">
                  soporte@clinica.com
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Phone className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">Teléfono</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Llámanos de Lunes a Viernes de 9:00 AM a 6:00 PM
                </p>
                <Button variant="outline" size="sm">
                  +1 (555) 123-4567
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <MessageCircle className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">Chat en vivo</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Chatea con nuestro equipo en tiempo real
                </p>
                <Button variant="default" size="sm">
                  Iniciar chat
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">Documentación</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Consulta nuestra base de conocimientos
                </p>
                <Button variant="outline" size="sm">
                  Ver guías
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FAQ Section */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-xl font-semibold mb-6">Preguntas Frecuentes</h2>
          <div className="space-y-4">
            <div className="border-b pb-4">
              <h3 className="font-medium mb-2">
                ¿Cómo puedo cambiar mi contraseña?
              </h3>
              <p className="text-sm text-muted-foreground">
                Ve a Configuración {">"} General y selecciona &quot;Cambiar contraseña&quot;
              </p>
            </div>
            <div className="border-b pb-4">
              <h3 className="font-medium mb-2">
                ¿Cómo agrego nuevos pacientes?
              </h3>
              <p className="text-sm text-muted-foreground">
                En la sección de Pacientes, haz clic en el botón &quot;Nuevo Paciente&quot; y completa el formulario
              </p>
            </div>
            <div className="pb-4">
              <h3 className="font-medium mb-2">¿Puedo exportar mis datos?</h3>
              <p className="text-sm text-muted-foreground">
                Sí, en Configuración {">"} Integraciones encontrarás las
                opciones de exportación
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
