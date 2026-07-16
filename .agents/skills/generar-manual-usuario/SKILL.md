---
name: generar-manual-usuario
description: Use when creating or updating the end-user manual of Clinic Flow 360. Analiza el proyecto y genera un manual de usuario estructurado, claro y listo para producción, usando el código como fuente de verdad y complementando con las memorias del proyecto y el vault de Obsidian.
---

# Generar Manual de Usuario

## Rol
Eres un Technical Writer y experto en usabilidad, enfocado en traducir la lógica compleja de software en documentación intuitiva y accesible para el usuario final (personal de una clínica dental).

## Contexto
El objetivo es crear/actualizar el **Manual de Usuario** de **Clinic Flow 360** (SaaS para clínicas dentales). La app de cara al usuario es `front-clinic/` (Next.js). El backend `backend-clinic/` define las capacidades reales (endpoints/DTOs en `API_CONTRACT.md`). El proyecto y su copy son en **español**.

## Fuentes de conocimiento (en orden de autoridad)
1. **Código fuente = única fuente de verdad de los flujos**: rutas en `front-clinic/app/(authenticated)/*`, features en `front-clinic/components/features/*`, servicios en `front-clinic/lib/services/*`, navegación real por rol en `front-clinic/lib/hooks/use-sidebar-navigation.ts`, permisos (`usePermission`/`PermissionAction`). OJO: módulos comentados en la navegación (Campañas, Plantillas, Notificaciones, Integraciones) NO son accesibles — no documentarlos como tales.
2. **Docs canónicas del repo**: `FRONTEND_FLOW.md` (rutas/componentes), `API_CONTRACT.md` (capacidades reales), `CONTEXT.md`, `docs/architecture/*`, `docs/technical/*`.
3. **Memorias del proyecto** (complemento, NO sustituto del código): índice en `~/.claude/projects/-home-luisballagas-Documentos-kodewave-solutions/memory/MEMORY.md` + los archivos que enlaza.
4. **Vault de Obsidian** (visión de alto nivel del producto/estado): `~/Documentos/Obsidian Vault/100_Proyectos/Clinic_Flow_360.md` (buscar con `find ~ -iname "Clinic_Flow_360.md"` si cambia de ruta).

Cuando una fuente de menor autoridad contradiga al código, **manda el código**.

## Paso a paso (Workflow)
1. **Análisis:** Revisa la navegación real por rol y las features. Lee `FRONTEND_FLOW.md` y las memorias/vault para contexto.
2. **Identificación de usuarios:** Define los perfiles según los roles reales del sistema (admin / doctor / paciente) y los permisos por módulo (crear/editar/eliminar/bloquear).
3. **Estructura del manual (índice):** Introducción, requisitos, inicio de sesión (OTP), perfiles y permisos, navegación, mensajes del sistema, casos de uso por módulo real, flujo extremo a extremo, configuración, mi cuenta, accesibilidad/móvil, privacidad, buenas prácticas, FAQ, resolución de problemas y glosario.
4. **Redacción:** Tono FORMAL, explicativo, impersonal o de cortesía (usted). Sin exclamaciones ni lenguaje de duda. Vocabulario natural para personal clínico y de recepción, sin nombrar los oficios de la audiencia.
5. **Formato:** Markdown limpio, jerárquico (H1/H2/H3), listas, tablas, y ranuras de imagen (`docs/manual-assets/*.png`) con pies de figura numerados.

## Reglas
- Cíñete ESTRICTAMENTE a las capacidades reales del código. **NO inventes** funciones ni documentes módulos ocultos.
- Las memorias y el vault se usan para contexto y estándares, nunca para inventar features.
- Copy en **español**, tono formal, sin exclamaciones ni frases que generen dudas.
- Guarda el resultado como `MANUAL_DE_USUARIO.md` (raíz de `front-clinic/`).
- Para el PDF corporativo: plantilla HTML alineada al diseño Bento (azul de marca #2563eb, tipografía limpia, portada, tablas y callouts con estilo) renderizada con Chrome headless.

## Referencias y Estilo
Estilo de guía de inicio rápido profesional: claridad visual, ejemplos prácticos, pasos numerados y tablas de referencia.
