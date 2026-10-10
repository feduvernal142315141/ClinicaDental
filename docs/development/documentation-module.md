# Documentación de pacientes

Ruta `/documentation`, menú dentro de Configuración, sin permiso de módulo por decisión del usuario.
Mantiene sesión autenticada e aislamiento de clínica en backend-clinic. No pide testigo ni identificación extra.

Editor de plantillas con importación Word/PDF/PNG/JPEG, revisión expresa de texto importado,
bloques ordenados de texto/firma/logo, alineación y ancho. El logo es el existente de la clínica.
El diseño original del archivo no se conserva: el texto extraído se recompone en PDF.
Guardar crea una revisión; documentos preparados/firmados conservan sus bytes y logo.

La API devuelve JSON directo; el servicio normaliza campos opcionales null. Importación multipart
espera hasta 210s. Las ediciones envían expectedVersion y la preparación templateVersion;
conflictos requieren actualizar y volver a abrir. La aceptación inicia desmarcada y requiere
previsualización exitosa antes de confirmar. Dibujar, borrar o cambiar modalidad invalida esa
previsualización. El backend compone el PDF final con fecha/hora de servidor.

El contrato completo y despliegue están en backend-clinic/docs/DOCUMENTATION_MODULE.md.
Las tablas del módulo quedaron activadas mediante V52 en localhost/clinic y el OCR local dispone
de Tesseract spa+eng. En otros entornos hay que aplicar las migraciones y configurar el OCR
antes de publicar el frontend. No se realizó despliegue a entornos compartidos.

## Comprobaciones

`yarn test lib/services/documentation/documentation.service.test.ts lib/validation/documentation.test.ts components/features/documentation/document-signing.test.tsx`: 19 pruebas pasan.
`yarn build`: pasa. `yarn typecheck`: 85 errores idénticos a HEAD aislado, ninguno nuevo.
`yarn lint`: mismos errores anteriores en saturday-config-panel.tsx; sin errores nuevos del módulo.

Prueba de navegador con identidad/branding sintéticos y backend/PG real en esquema temporal:
creación y edición con logo, firma por casilla y dibujada, previsualización, persistencia y recarga;
menú con permisos vacíos, móvil sin desbordamiento y modo oscuro.
Importación en UI se comprobó con respuesta ficticia; extracción/OCR real tiene tests de backend.
No equivale a validar login real, producción o la instalación de OCR en el servidor destino.

## Navegación del editor

Crear: `/documentation/templates/new`; editar: `/documentation/templates/[id]/edit`.
Son páginas independientes: recarga y acceso directo recuperan la plantilla desde la API.
Guardar o cancelar vuelve al listado. El editor ocupa el ancho disponible del shell,
con campos y bloques en columnas en escritorio y una sola columna en móvil.

## Importación y posiciones libres

La importación admite soltar un archivo o seleccionarlo con teclado/clic; conserva los límites
y la revisión del texto extraído. El visor dibuja la página en el navegador: arrastre con puntero/touch o flechas (Mayús: 10 puntos). Las coordenadas se
guardan al guardar la versión. Se puede mover un elemento entre páginas existentes o
volver a su posición en el flujo de texto. El texto evita automáticamente las áreas del logo y la firma.

`position: {page, x, y}` es opcional; página comienza en cero y las coordenadas se expresan
en puntos PDF desde la esquina superior izquierda. El logo conserva su proporción.
La firma libre reserva 180 puntos de alto y al menos 200 de ancho para aceptación y fecha.
El endpoint POST `/documentation/templates/layout?page=0` sigue disponible para clientes que
requieran renderizado en servidor, pero el editor no lo utiliza. Su autenticación y aislamiento
de clínica se mantienen.

Validación anterior de las posiciones libres: 36 pruebas de frontend pasan. Navegador con backend/PG reales
y datos sintéticos: arrastre, teclado, guardado, recarga y coincidencia de coordenadas PDF.
Typecheck mantiene 85 errores anteriores; lint mantiene cuatro errores ajenos al módulo.

## Editor sobre la página

El formulario de plantilla muestra el visor PDF como superficie principal, sin modal de
posicionamiento. Pulsar un área TEXT permite modificar su contenido en la propia página
y «Aplicar texto» actualiza la página localmente. La barra inserta texto, firma o logo; el panel
lateral selecciona elementos, modifica su ancho, orden o eliminación. Hay navegación y zoom.
Logo/firma se mueven directamente mediante pointer capture (mouse/touch) o flechas.
No se solicita un nuevo fondo durante el arrastre, incluida la ampliación de firmas antiguas.
Las áreas TEXT se calculan localmente y pueden abarcar varias páginas. Los borradores vacíos
usan texto indicativo únicamente en el visor; ese texto no se guarda en la plantilla.

Validación anterior del visor con renderizado en servidor: 39 pruebas frontend y build pasan. Navegador con compilación de
producción y API/PG reales (identidad sintética): edición sobre página, arrastre de logo
y firma, teclado, guardado, recarga directa, móvil y oscuro. Typecheck conserva 85 errores
previos y lint cuatro errores de saturday-config-panel.tsx; ninguno nuevo en Documentación.

Errores de importación, persistencia y vista previa PDF: los HTTP 400/422 muestran el mensaje controlado de la API.
Conflicto/acceso mantienen las traducciones existentes; red/500/body inválido usan mensaje
genérico sin diagnósticos del servidor. La revisión de texto sigue accesible si falla el PDF.
La regresión Word se validó con DOCX sintético, subida HTTP real, fuente persistida y página PDF.
43 pruebas frontend pasan; tipos/lint conservan los errores anteriores y el build pasa.

El arrastre ya no solicita layout al soltar el puntero. Cambiar coordenadas con arrastre,
flechas o «Mover a esta página» actualiza el borrador local; Guardar versión envía el
estado final mediante la operación de guardado existente. No hay autosave de coordenadas.
Una regresión cubre varios arrastres completos sin peticiones adicionales; otra usa el
formulario real y verifica una única llamada a save al pulsar Guardar con las últimas coordenadas.

## Edición local completa

Nombre, texto, estructura, dimensiones, posición y navegación de páginas no envían el
borrador a la API. `local-document-layout.ts` reproduce las reglas de flujo A4 del escritor
PDF y el visor utiliza SVG, con la fuente Roboto ya empleada en backend. El logo viene de
la marca de clínica cargada por el contexto existente. Guardar versión envía el estado
final; importar un archivo y solicitar explícitamente la vista previa PDF siguen usando API.
Si falla la carga de la fuente se utiliza la fuente de sistema, con posible diferencia de
saltos de línea; la vista previa PDF explícita permite revisar el resultado del servidor.

Validación de la edición local: 44 pruebas del módulo y build pasan. Las regresiones
verifican aplicar texto sin layout/save, arrastre, teclado, paginación y una única llamada
al guardar desde el formulario real. Comprobación visual aislada del componente en
escritorio y móvil con datos sintéticos; no implica repetir la integración API/PG.
Typecheck conserva 85 errores previos y lint cuatro errores previos fuera del módulo.

## Redistribución sin solapamientos

Las posiciones libres reservan su área antes de componer el título y el cuerpo. Las líneas
que colisionan bajan hasta encontrar espacio, con separación de 8 puntos, y el texto puede
continuar en otra página. Al retirar un elemento, el texto vuelve a su flujo natural.
Las áreas editables TEXT se dividen alrededor de esos huecos. El arrastre/teclado y el
cambio de ancho buscan una posición libre cerca del destino si hay otro logo o firma.
El backend aplica las mismas reglas al generar nuevos PDFs y rechaza figuras libres que
se superpongan. Los PDFs ya preparados o firmados conservan sus bytes. No se hacen
peticiones durante estos ajustes locales.

Validación de esta corrección: 48 pruebas frontend, typecheck sin errores nuevos, lint
sin mensajes nuevos en el módulo y build correcto. Reproducción visual aislada en
escritorio/móvil: logo sobre encabezado, texto desplazado y vuelta al retirar el logo.

## Nuevas páginas

«+ Nueva página» añade una página al final y abre esa página vacía. El borrador incluye
un bloque `PAGE_BREAK` con `page` base cero como destino mínimo, después del último
contenido. Texto o elementos añadidos a continuación pertenecen a la nueva página.
El salto se puede seleccionar, reordenar o quitar desde el panel. Las páginas vacías
se mantienen al guardar y al recargar; no se hace una petición por añadirlas.
La UI limita el documento a 100 páginas y los bloques a 100, como la API.
El backend debe admitir `PAGE_BREAK` antes de publicar este frontend; no necesita
migración porque los bloques siguen almacenándose en el JSONB de cada revisión.

Validación de nuevas páginas: 55 pruebas frontend y build pasan; typecheck mantiene
los 85 errores anteriores y no añade errores del módulo. Comprobación visual aislada:
botón Nueva página, página vacía y texto añadido en la segunda página.

### Redimensionado de elementos

El editor permite arrastrar las cuatro esquinas del logo y de la firma, o usar las flechas sobre esos controles (Mayús: 10 puntos). El logo conserva su proporción; la firma admite ancho y alto independientes, con alto opcional `height` de 120–450 puntos. El ancho y el alto se guardan como puntos enteros. Las plantillas anteriores sin `height` conservan su tamaño por defecto. El texto se ajusta localmente alrededor de los elementos y se respetan los márgenes y las posiciones libres de otros elementos. El guardado explícito persiste la versión y el PDF utiliza las mismas dimensiones; los documentos ya preparados o firmados mantienen su copia.

### Sustitución al importar y eliminación de páginas

Una importación correcta reemplaza todos los bloques anteriores (texto, logos, firmas y saltos de página), cierra la vista previa y devuelve el visor a la primera página. No se añade ninguna firma automáticamente; se debe añadir al menos una antes de guardar. Una importación fallida conserva el borrador. «Eliminar página» borra el contenido visible de la página actual, incluso la parte correspondiente de un texto que ocupa varias páginas; elimina logos y firmas de esa página y renumera las posiciones libres y saltos restantes. Siempre queda al menos una página. Estas ediciones son locales hasta guardar una versión y no afectan a los PDFs preparados o firmados.

Los logos nuevos se colocan en la página visible, junto al elemento seleccionado si hay espacio. Los elementos con posición libre no consumen una segunda reserva en el flujo: sólo se evita su rectángulo real. El alto mínimo de firma es 120 puntos (por defecto 180), y puede reducirse verticalmente sin cambiar su ancho. El backend actualizado es necesario para guardar los tamaños compactos.

El nombre de plantilla es un dato de gestión, no un encabezado del documento. El visor y el PDF no insertan el nombre ni «Vista previa de plantilla» automáticamente; los títulos del texto importado son bloques editables.

### Firmas por firmante

Los bloques `SIGNATURE` y los slots persistidos admiten `signerRole: PATIENT | SPECIALIST`. La ausencia del campo significa paciente, para conservar plantillas y documentos anteriores. La plantilla requiere al menos una firma del paciente; puede incluir firmas del especialista (máximo cinco espacios en total). El documento expone `signatureRoles`, derivado de sus slots inmutables. La aceptación del paciente conserva dibujo/casilla. Si los slots requieren especialista, se exige `specialistSignatureBase64` (PNG, mismos límites y validación de tinta que el paciente). Se recoge por separado y se incorpora únicamente en los espacios del especialista, con fecha y hora del servidor. La confirmación guarda las dos firmas juntas; el hash de idempotencia incluye la firma del especialista y los PDFs anteriores no cambian. Desplegar el backend actualizado antes del frontend. No requiere migración de esquema: usa los JSONB existentes.

## Variables del documento

El texto admite las variables `{{paciente.nombre}}`, `{{paciente.correo}}`,
`{{paciente.telefono}}`, `{{paciente.fecha_nacimiento}}`, `{{paciente.genero}}`,
`{{paciente.direccion}}`, `{{paciente.identificacion}}`, `{{doctor.nombre}}`, `{{doctor.licencia}}` y
`{{doctor.especialidad}}`. El selector «Insertar variable» inserta en la selección/cursor
del texto; las ediciones permanecen locales hasta guardar. Se permiten espacios
dentro de las llaves. Otras variables y delimitadores incompletos se rechazan.

Al preparar, se selecciona el paciente y, sólo cuando el texto requiere variables
de doctor, también un doctor. `POST /documentation/documents` admite `doctorId`
opcional; backend comprueba que pertenece a la clínica y está activo.
`GET /documentation/doctors?search=...&limit=25` busca usuarios/doctores activos
de la clínica (mínimo dos caracteres), devuelve exclusivamente `{id,name}[]`,
y mantiene autenticación sin permiso adicional del módulo.

El backend lee los datos actuales, sustituye una sola vez como texto plano y
recompone/pagina antes de congelar el PDF. No confía en valores enviados por el
navegador ni interpreta expresiones. Nacimiento se muestra como `dd/MM/yyyy`,
sin convertir la fecha civil a la zona de clínica; M/F se muestran Masculino/Femenino.
Si un campo referenciado está vacío, se pide completar la ficha antes de generar.
Campos vacíos no referenciados no bloquean. La plantilla conserva sus variables;
el PDF preparado y firmado conserva los datos sustituidos aunque cambien fichas,
logo o versiones. No se recalcula al firmar y no requiere migración de esquema.
Desplegar backend actualizado antes del frontend.

`{{tratamiento}}` es una variable reservada disponible en «Otras variables». Se admite al guardar y generar, pero conserva literalmente su marcador en el PDF hasta definir la fuente de sustitución. No requiere seleccionar doctor ni consulta tratamientos todavía.

Durante la edición de texto, el selector y el botón de variables aparecen en la barra sticky del visor, junto a navegación y zoom, fuera de la superficie que se desplaza. Conservan la selección del texto y restauran el foco sin desplazar el documento.

`{{fecha_actual}}` está disponible en «Otras variables». Se sustituye en el backend al preparar el documento con la fecha del mismo instante de `createdAt`, usando la zona horaria de la clínica y formato `dd/MM/yyyy`. No usa la fecha del navegador ni se recalcula al previsualizar la firma, firmar o consultar un PDF almacenado. La plantilla conserva el marcador.

`{{paciente.identificacion}}` se inserta desde «Paciente» y se sustituye por `identificationNumber` de su ficha al preparar el PDF. Conserva letras y ceros iniciales. Si está vacío y la plantilla lo utiliza, se solicita completar la ficha antes de generar. El valor queda congelado en los documentos preparados y firmados.

Los selectores de preparación reutilizan `patientsService.getPatients` y `doctorsService.getDoctors`: GET `/patients` y `/doctor`, con `page=0`, `pageSize=10`, `filters=name__CONTAINS_IGNORE_CASE__texto` y `filters=active__EQ__true`. Consumen `entities` del resultado paginado y mantienen únicamente `id` y `name` en las opciones. El frontoffice ya no utiliza las búsquedas específicas `/documentation/patients` y `/documentation/doctors`.

«Fecha del documento» permite configurar el origen al insertar: `{{fecha_documento:actual}}` usa la fecha de preparación en la zona de la clínica; `{{fecha_documento:seleccionada}}` pide una fecha al preparar (`documentDate`, ISO `yyyy-MM-dd`). Ambas se imprimen en `dd/MM/yyyy`; `{{fecha_documento}}` y el alias antiguo `{{fecha_actual}}` mantienen la fecha de generación. El backend exige una fecha seleccionada cuando corresponde y rechaza fechas enviadas a plantillas automáticas. Los valores quedan congelados en el PDF preparado, sin afectar documentos existentes.

### Edición con formato

El texto se edita con TipTap dentro del visor. La barra fija permite aplicar negrita, cursiva, subrayado, fuente (Roboto, Arial, Times New Roman, Courier New), tamaño (6–72 pt), alineación del párrafo (izquierda, centro, derecha, justificado) y deshacer/rehacer. Los estilos se guardan como `textStyles`: rangos UTF-16 `[start,end)` sobre el texto plano; no se envía HTML. El visor y el PDF usan los mismos archivos de fuentes y reglas de flujo. La inserción de variables conserva formato, selección y scroll; la eliminación de páginas ajusta también los rangos de estilo. Ninguna acción del formato envía peticiones. Guardar persiste una versión y Vista previa PDF genera explícitamente el PDF con el borrador. Requiere desplegar primero el backend con soporte para `textStyles`; documentos anteriores conservan su PDF inmutable.


## Observaciones configurables en documentos (2026-10-09)

El selector «Observaciones» abre un modal que exige un título (1–100 caracteres, sin
llaves ni controles/saltos de línea). Inserta `{{observaciones:Riesgos personalizados}}`
en la selección conservando formato y scroll. Cada título distinto genera un campo
multilínea al preparar el documento; títulos repetidos comparten valor.

`POST /documentation/documents` admite el campo opcional `observations`, un objeto
de título a texto: `{"observations":{"Riesgos personalizados":"Texto completado"}}`.
Se exige un valor no vacío por título referenciado; se rechazan títulos ajenos,
valores de más de 5000 caracteres, delimitadores de variables en los valores,
más de 100 títulos o más de 50000 caracteres totales. Las plantillas sin observaciones
conservan el payload anterior. El texto se sustituye literalmente, heredando estilo,
y se congela en el PDF preparado. Cambiar plantilla no altera documentos existentes.
Sin cambios de esquema, repositorios ni permisos. Desplegar backend antes del frontoffice.

## Documentación asociada a servicios (2026-10-09)

POST/PUT `/services` aceptan `documentationTemplateId` (UUID o null) y
`documentSignatureRequired` (boolean). GET de detalle/listado devuelve ambos.
Sin documento, la firma debe ser false. PUT con ambos campos ausentes/null conserva
la configuración para clientes anteriores; para quitarla enviar null + false.
La plantilla debe estar activa, publicada, sin borrado lógico y pertenecer a la
clínica del usuario. Se conserva el permiso existente de crear/editar servicios;
la lista de plantillas mantiene el permiso de lectura de Documentación.

El formulario carga todas las páginas del catálogo, conserva la selección en
fallos de red y permite reintentar. Los documentos preparados/firmados no cambian.
Esta entrega configura el requisito por servicio; no introduce bloqueos de agenda,
tratamientos ni generación automática de documentos.

Despliegue: aplicar V62 mediante Flyway al arrancar backend antes de publicar el
frontoffice. Aditiva: servicios existentes quedan sin plantilla y firma=false.
FK compuesta impide asignaciones entre clínicas; CHECK exige plantilla si la firma
es obligatoria. Puede tomar locks breves al alterar services. Rollback de aplicación:
restaurar binarios anteriores conservando columnas y datos; no eliminar columnas.
V62 confirmada libre por el usuario; historial local V61, fetch remoto bloqueado por
autenticación durante esta tarea. No se aplicó la migración a la base principal.


## Documentos del odontograma por consulta

El panel «Documentos de esta consulta» reúne los planes seleccionados desde
«Realizado» de varios dientes. «Añadir a esta consulta» no ejecuta tratamientos.
Al confirmar la selección final se persiste primero el odontograma y se envían
los IDs de eventos a `/documentation/visits/{visitId}/selection`, junto con
`expectedSelectionHash` y las observaciones por plantilla. El servidor resuelve
servicios y agrupa por plantilla. El GET de esa misma consulta devuelve
`eventIds` (también servicios sin documento), `selectionHash` y `groups`.

Cada grupo indica documento, firma obligatoria y tratamientos/piezas cubiertos.
La firma reutiliza el módulo documental. El registro de realizados construye
un snapshot aislado, lo guarda y solo entonces actualiza la vista. Autosave y
operaciones explícitas se serializan. El backend vuelve a validar firmas y
cobertura; cancelar la revisión no ejecuta procedimientos.

Cambiar un grupo elimina el documento anterior, su PDF y firmas sin versiones
históricas; los grupos no modificados se conservan. Cada consulta tiene sus
propios documentos; la vista histórica carga por UUID de consulta y es de solo
lectura. Desplegar primero el backend con el contrato y la migración V63.
La tabla de planes generales del paciente es un flujo separado: los servicios
con firma obligatoria necesitan vinculación a eventos del odontograma.


### Documentación de la consulta: pestaña dedicada

La historia clínica incluye la pestaña `Documentación` (`?tab=documentacion`).
Comparte la instancia del odontograma con la pestaña `Odontograma`, conservando
los tratamientos seleccionados al cambiar entre vistas. En documentación se
listan los grupos. Seleccionar un documento abre un modal con un campo de observaciones
por paso, navegación anterior/siguiente y revisión final antes de generar. Los documentos
ya generados se revisan y firman desde ese mismo modal. Los datos pendientes se conservan en memoria al cambiar
de documento; se envían al generar los documentos cuando todos están completos.
La selección de tratamientos queda en un desplegable y las acciones principales
en un pie visible dentro del área desplazable. Las consultas históricas son de
solo lectura. La agrupación y los contratos del backend no cambian.

### Firma desde el documento

El visor muestra las páginas del PDF almacenado en scroll continuo. Comprueba
el hash antes de mostrar cada página y escala sus campos de firma junto con
la imagen. La sesión clínica muestra únicamente el control SPECIALIST; la
vista pública, únicamente PATIENT. Las firmas dibujadas o la aceptación por
casilla aparecen sobre el documento. El flujo remoto siguiente reemplaza la
captura de la firma del paciente dentro del odontograma.

### Firma remota del paciente por WhatsApp

El personal ya no captura ni confirma la firma del paciente. `DocumentSigning`
solo muestra campos interactivos SPECIALIST y requiere esa firma cuando la
plantilla la incluye antes de `POST /documentation/documents/{id}/signature-request`.
La respuesta contiene estado, vencimiento y teléfono enmascarado; nunca el enlace
ni el token. Se recibe el estado mediante SSE en `/signature-events`
mientras está SENT o LINK_READY; reconecta tras errores de red y también permite actualización manual.
Al recibir SIGNED se recupera el documento mediante el endpoint autenticado.

El paciente abre `/firmar-documento#token=...`, ruta pública independiente del
shell, sesión, interceptores, listeners globales y analítica. El fragmento se
retira inmediatamente y el token se conserva temporalmente en sessionStorage
para permitir recargas dentro de su vigencia. No se guarda en localStorage ni cookies.
El proxy same-origin `/api/document-signing/{action}` admite exclusivamente
context/page (GET) y preview/sign (POST), reenvía el token mediante
X-Document-Token a `/public/document-signing`, y nunca transmite cookies ni
Authorization del profesional. API_URL sigue siendo configuración de servidor.
Respuestas sin caché, errores genéricos y cuerpo de firma limitado a 1.5MB.

La vista reutiliza el visor continuo con cargador público inyectado y filtra
roles PATIENT; no presenta el control de firma del especialista. Aceptación
explícita y previsualización exitosa preceden la confirmación. Modificar el
método, la firma o la aceptación invalida esa revisión. El servidor decide
vigencia, uso único, documento exacto y consumo atómico. El temporizador local
retira documento y modal al vencer expiresAt; la validación de seguridad sigue
siendo responsabilidad del backend. No se enviaron mensajes reales en pruebas.

Despliegue coordinado con el backend que incorpora V64 y los endpoints públicos.
Configurar la URL HTTPS pública y la plantilla aprobada de WhatsApp en backend
antes de usar el envío. Las antiguas operaciones de firma desde staff quedan
bloqueadas por el backend. Las pruebas con mocks no validan entrega de WhatsApp
ni navegación real desde teléfono.

La firma pública conserva temporalmente el token en sessionStorage de la pestaña y del origen de la clínica para permitir recargas. El fragmento se elimina de la URL. La caducidad se toma del backend y no se renueva al recargar; el token se elimina al firmar, vencer o recibir un rechazo de autenticación. No se almacenan el PDF, los datos clínicos ni la firma dibujada. Si el navegador bloquea sessionStorage, la firma sigue disponible en memoria, pero requiere reabrir el enlace después de recargar.

Al confirmar la firma del especialista se solicita el enlace automáticamente. La vista de espera muestra la caducidad del servidor y recibe eventos SSE hasta SIGNED o EXPIRED. Al firmar el paciente, se recupera el documento firmado y se actualiza el grupo de la consulta. Al vencer se permite solicitar otro enlace; en simulación el enlace sigue disponible en el log del backend.

### Espera de firma remota por SSE

El frontoffice abre `GET /documentation/documents/{id}/signature-events` con el
adaptador fetch de Axios, conservando los interceptores Bearer y refresh. Cada
evento `status` contiene `SignatureRequestStatus`; el primer evento también
reconcilia el estado después de reconectar. La conexión se cancela al desmontar
y termina en NONE, SIGNED o EXPIRED. Las desconexiones se recuperan con backoff,
sin consultar periódicamente el endpoint de estado.

Al cargar una consulta editable se consultan una vez las solicitudes de los
documentos pendientes. Si hay un enlace vigente, se reabre el modal de espera
aunque la pestaña activa sea el odontograma. Al completar uno, se reconcilia
la consulta y se recupera la siguiente solicitud pendiente si existe. No se
reenvían enlaces ni se persisten estados clínicos en storage durante la recarga.


### Tabla de documentos de la consulta

La pestaña Documentación usa la tabla compartida del frontoffice: una fila por
plantilla, servicios sin duplicar, cantidad de piezas distintas y acciones según
estado. Generar abre el asistente de esa fila y envía `templateIds: [id]` junto a
la selección completa y las observaciones de esa plantilla. Las demás filas
permanecen pendientes; revisar y firmar abre directamente el visor.

Reiniciar exige confirmación y llama a
`POST /documentation/visits/{visitId}/documents/{documentId}/restart` con
`expectedSelectionHash`. La respuesta mantiene la selección y omite el documento
eliminado; el cliente reconstruye su borrador, limpia sus campos anteriores y
abre el asistente. El backend elimina PDF, firmas y enlaces anteriores, y rechaza
conflictos de selección, consultas cerradas y tratamientos ya realizados.
El histórico solo permite visualizar documentos. El bloqueo de espera y SSE
mantienen su flujo existente.
