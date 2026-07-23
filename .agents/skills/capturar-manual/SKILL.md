---
name: capturar-manual
description: Capturar de forma autónoma las 12 pantallas reales del Manual de Usuario de Clinic Flow 360 (T-24), verificarlas contra el manifiesto y regenerar el PDF corporativo con las imágenes incrustadas. Encodea el pipeline completo — entorno, login automatizado con OTP de respuesta, estándar visual, siembra de datos demo, flujos especiales, verificación y limpieza.
when_to_use: Cuando haya que producir, reponer o verificar capturas del manual (docs/manual-assets/*.png) o regenerar MANUAL_DE_USUARIO.pdf con imágenes.
user-invocable: true
effort: high
---

# Capturar las pantallas del Manual de Usuario

**Fuente de verdad de los 12 shots**: `front-clinic/docs/manual-assets/shots.manifest.json` (rutas, pasos, selectores, checklist `mustShow`, riesgos por captura). El README.md de esa carpeta tiene la tabla humana. Ante conflicto con la UI real, manda el código — y se actualiza el manifiesto.

> **Alcance actual (decisión del usuario, 2026-07-21)**: los shots `odontograma` e `historia-clinica` (flujo de consulta activa) están **DIFERIDOS** — no ejecutar `manual-capture-consulta` ni analizar ese flujo hasta nueva orden. El PDF se regenera con placeholders para esas dos figuras. Alcance activo: los otros 10 shots.

## Arquitectura (no negociable)

- **Los PNG los produce un script determinista** (`manual-capture/` en la **raíz del workspace**, proyecto aparte por decisión del usuario — hermano de front-clinic y backend-clinic, con `package.json` propio: `puppeteer-core` + Chrome del sistema `/usr/bin/google-chrome`; OJO: la raíz no está versionada en git). El Browser pane de Claude NO puede guardar screenshots como archivo: úsalo solo para explorar flujos, depurar un shot fallido y verificar estados en vivo.
- **La verificación es agéntica**: cada PNG se lee con la herramienta Read (soporta imágenes) y se valida contra su `mustShow`. El agente `manual-shot-reviewer` hace la pasada adversarial final.
- **Un solo navegador del pane por sesión**: los agentes de captura se ejecutan EN SECUENCIA, nunca en paralelo.
- Contrato del script: `node capture.mjs --shot <id>[,<id>…]` o `--all`; env `CAPTURE_EMAIL`, `CAPTURE_PASSWORD`, `BASE_URL`, `API_URL`.
- **Sesión entre invocaciones**: las cookies de auth de la app son de SESIÓN (`setAuthCookies` sin `maxAge`) → mueren con cada proceso de Chrome; el perfil `.chrome-profile/` NO las conserva. `ensureLogin` las **reconstruye desde el localStorage persistido** (`tryRestoreSession`) y solo hace login real si eso falla. Regla operativa: **agrupar shots en UNA invocación** (`--shot a,b,c` / `--all`) en vez de una invocación por shot — cada login real = un email Mailjet.

## Entorno (checklist previo)

1. **Puerto 3000 libre**: suele ocuparlo `traductorn8n-gotenberg-1` (otro proyecto del usuario). El CORS del backend SOLO admite `http://localhost:3000` — sin liberar el puerto nada funciona. `docker stop traductorn8n-gotenberg-1` **con OK del usuario** y `docker start` al terminar.
2. **Backend**: `cd backend-clinic && ./mvnw spring-boot:run -Dspring-boot.run.profiles=local` (puerto 8080). Usa la **DB nativa 5432** (`postgres/postgres`, DB `clinic`, clínica "Dental Max") — NO la del docker-compose (5433, desactualizada). Verificar que no haya `DB_URL`/`DB_USERNAME` exportadas que desvíen la conexión.
3. **Frontend**: SIEMPRE vía `preview_start {name: "front-clinic"}` (launch.json), nunca Bash.
4. **Credenciales**: `admin@clinic.com / Admin123` (hardcodeadas en `DoctorSeeder.java`, se siembran al arrancar Spring). El **OTP viene en el body de la respuesta** del `POST /auth/login` en perfiles no-prod: el script lo intercepta (`page.on('response')`) y lo teclea en `/validate-otp`. NO usar `admin.norte@clinic.com` (contraseña no está en el repo; solo por env var).
5. **Ojo Mailjet**: cada login real dispara un email con claves reales de `application-local.yml`. Minimizar logins: agrupar shots en una sola invocación del script y confiar en la restauración de sesión desde localStorage (ver arriba); el mensaje "Sesión restaurada desde el perfil" confirma que NO hubo login real.

## Estándar visual

- Viewport **1440×900, deviceScaleFactor 2**, **tema claro**, copy en español.
- Salida: `front-clinic/docs/manual-assets/<id>.png` con los nombres EXACTOS del manifiesto.
- Solo datos demo; jamás datos reales de pacientes. Esperar spinners/skeletons/avatares antes de capturar. Vistas autenticadas con sidebar + barra superior visibles.
- No enviar submits que creen datos (paciente-form, cita-nueva): capturar el estado previo.

## Siembra de datos demo (antes de capturar)

Estado conocido de la DB nativa (2026-07-21): 15 pacientes realistas, 6 doctores, 26 servicios, 11 odontogramas ricos (usar **Valentina Gómez**), 49 visit records. Faltantes:

- **Agenda**: 0 citas futuras → sembrar 2-3 citas `scheduled` para el día de la captura, repartidas entre doctores.
- **Roles**: solo "Administrador" (protegido) → sembrar 2-3 roles demo (Recepción, Doctor) con matrices variadas.
- **Config regional**: `clinic_settings=0` → guardar una configuración con moneda antes de capturar.
- **Ruido**: desactivar el paciente basura "asdasdasd…" (sale primero por fecha); valorar renombrar el doctor "Admin".
- **Vía de siembra: SQL directo** (decisión del usuario, 2026-07-21) contra la DB nativa 5432, respetando `clinic_id` de Dental Max (`50ba0a63-…`). Gotchas (memoria `seed-second-clinic`): bcrypt `$2a$10$`, `update_at` en el pasado, `password_changed=true`. Excepción natural: la configuración regional se guarda desde la propia pantalla al capturarla (el cambio pendiente forma parte del shot).

## Flujos especiales

- **inactividad.png**: editar TEMPORALMENTE `lib/constants/auto-logout.ts` → `WARNING_TIME_MINUTES: 0.1`, `INACTIVITY_TIME_MINUTES: 5`; recargar la página logueada; NO emitir mousedown/keydown/scroll ~7s (mousemove no resetea; requests Axios sí). **REVERTIR SIEMPRE** — valores de producción: `INACTIVITY_TIME_MINUTES: 15`, `WARNING_TIME_MINUTES: 13` (WARNING siempre MENOR que INACTIVITY); lo más seguro es `git checkout -- lib/constants/auto-logout.ts`.
- **odontograma.png + historia-clinica.png**: requieren consulta activa (express: 'Iniciar Nueva Consulta' → modal → `POST /appointments/start-now`). Capturar AMBAS en la misma consulta, escribir solo texto demo en las notas (autosave real) y **FINALIZAR la consulta al terminar** (no dejar citas `in_progress` colgadas).
- **config-regional.png**: el popover de moneda se cierra con cualquier click fuera/scroll → capturar inmediatamente tras abrirlo.

## Verificación (por cada PNG)

1. Read del PNG → comprobar CADA ítem de su `mustShow` en el manifiesto.
2. Checklist transversal (Document360): la imagen corresponde exactamente al paso del manual que la referencia; un solo estado por figura; sin datos reales; sin ruido (paciente basura, errores de consola visibles, tooltips accidentales); tema claro; proporciones 1440×900.
3. Fallo → depurar con el Browser pane, corregir manifiesto/script, recapturar. Nunca aprobar "parecido": el texto del manual nombra botones y columnas concretos.
4. Pasada final: delegar en el agente `manual-shot-reviewer` (adversarial, lee las 12 + el manual).

## Regenerar el PDF

Script canónico: `front-clinic/scripts/build-manual-pdf.py`. Si no existe (se perdió el original de scratchpad — checkpoint 08), reconstruirlo con esta spec verificada:
- `python3` + módulo `markdown` (3.5.2 disponible) para MD→HTML; render con `google-chrome --headless=new --print-to-pdf` (A4).
- Diseño Bento: azul de marca `#2563eb`; portada con gradiente + chip; H2 en azul con filete; tablas con cabecera tintada; callouts con borde de marca.
- **SIN pie de página fijo**: Chrome no reserva espacio para `position:fixed` al imprimir y enmascara el contenido del fondo de página (bug ya sufrido). Numeración de página = T-25 (requiere weasyprint/wkhtmltopdf, diferido).
- Las 12 imágenes se referencian desde el markdown como `docs/manual-assets/<id>.png`; con los PNG presentes se incrustan; sin ellos, placeholders.
- Verificar: `pdfinfo` (≈18+ págs A4) y Read de páginas clave del PDF comparando contra el PDF commiteado de referencia.

## Limpieza post-sesión (SIEMPRE)

1. Revertir `lib/constants/auto-logout.ts` (git diff debe salir limpio en ese archivo).
2. Finalizar cualquier consulta `in_progress` creada.
3. `docker start traductorn8n-gotenberg-1` si se detuvo.
4. Retirar datos de siembra que ensucien (o dejarlos si son demo presentable — decisión explícita).
5. `git status` en front-clinic: solo deben quedar los PNG nuevos (+ PDF regenerado). `*.pdf` está en el gitignore global → `git add -f` si el usuario pide commit; verificar si `*.png` también lo requiere.
