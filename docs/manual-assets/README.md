# Capturas del Manual de Usuario

Coloque en esta carpeta las capturas de pantalla reales del sistema, con los nombres exactos indicados abajo. El `MANUAL_DE_USUARIO.md` ya las referencia; al añadir los archivos `.png`, se mostrarán automáticamente.

Recomendaciones de captura: navegador maximizado, tema claro, datos de demostración (sin información real de pacientes), formato PNG.

> **Automatización**: la especificación detallada de cada captura (ruta, pasos, selectores, checklist `mustShow`, riesgos) vive en [`shots.manifest.json`](./shots.manifest.json) — es la fuente de verdad del script de captura (proyecto `manual-capture/` en la raíz del workspace) y de los agentes `manual-capture-*`. Ver la skill `capturar-manual`. `odontograma.png` e `historia-clinica.png` están diferidas (2026-07-21).

| Archivo | Pantalla a capturar |
|---|---|
| `login.png` | Pantalla de inicio de sesión ("Bienvenido de vuelta"). |
| `inactividad.png` | Aviso "Advertencia de inactividad". |
| `pacientes-lista.png` | Listado de pacientes (buscador, columnas, estado). |
| `paciente-form.png` | Formulario de alta/edición de paciente. |
| `agenda.png` | Agenda de citas por doctor y fecha. |
| `cita-nueva.png` | Formulario de nueva cita con selección de horario disponible. |
| `odontograma.png` | Odontograma en una consulta activa. |
| `historia-clinica.png` | Historia clínica de la visita (diagnóstico, hallazgos). |
| `config-regional.png` | Configuración regional (selector de moneda con bandera y símbolo). |
| `doctores-lista.png` | Listado de doctores en Configuración. |
| `servicios-lista.png` | Catálogo de servicios. |
| `roles-permisos.png` | Editor de rol con la matriz de permisos por módulo. |
