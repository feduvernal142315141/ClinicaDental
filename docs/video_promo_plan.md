# 🎬 Plan de Video Promocional: Clinic Flow 360

Este documento sirve como guía completa para planificar, grabar y producir el video de demostración promocional de Clinic Flow 360, destacando sus capacidades core en la gestión de pacientes y la experiencia de usuario clínica.

## 1. Herramientas Recomendadas (Ecosistema Google / Gratuitas)

Dado que cuentas con **Google One Pro**, tienes acceso a herramientas excelentes y espacio de sobra.

### 🎥 Grabación de Pantalla
*   **OBS Studio (Gratuito y Open Source):** Es el estándar de la industria. Permite grabar la pantalla en alta calidad (1080p o 4K a 60fps). Configúralo para grabar solo la ventana del navegador (sin la barra de tareas o pestañas irrelevantes) para un look profesional.
*   *Alternativa integrada:* Si usas Mac (QuickTime) o Windows 11 (Xbox Game Bar), las herramientas nativas son suficientes si buscas algo más rápido y directo.

### ✂️ Edición de Video
*   **CapCut (Versión de escritorio gratuita):** Aunque no es de Google, es la herramienta gratuita más potente, intuitiva y rápida para editar este tipo de videos, añadir textos dinámicos, transiciones y hacer "zoom-ins" a zonas clave de la interfaz.
*   **Google Vids (Si tienes acceso en Workspace):** La nueva IA de Google para crear videos orientados al trabajo.

### 🎙️ Voz en Off e IA de Audio
*   **NotebookLM (de Google):** Puedes subir tu guion y generar un resumen de audio tipo podcast (Audio Overview), aunque para un video comercial suele ser mejor usar **Google Cloud Text-to-Speech** (que te ofrece voces neuronales hiperrealistas gratis hasta cierto límite).
*   **ElevenLabs (Capa gratuita):** Para voces ultra realistas, su capa gratuita es inmejorable para videos cortos.

## 2. Configuración para Grabar (Best Practices)

1.  **Limpieza Visual:** Oculta tus marcadores del navegador. Usa modo pantalla completa (F11).
2.  **Datos Ficticios:** Asegúrate de usar pacientes de prueba (ej. "Juan Pérez"). No grabes datos reales.
3.  **Resolución y Escala:** Graba en 1080p (1920x1080). Si tu monitor es 4K, aumenta el zoom del navegador al 125% o 150% para que los textos pequeños (como el Odontograma) se lean perfectamente en móviles.
4.  **Movimiento del Cursor:** Usa movimientos suaves. Pausa un segundo antes de hacer clic en botones importantes (ej. "Iniciar Consulta"). Considera habilitar un efecto visual sutil para el clic del ratón durante la grabación en OBS.

---

## 3. Guion del Video Demo (Aprox. 60 - 90 segundos)

**Concepto Visual:** Dinámico, moderno, enfocado en mostrar que el software es rápido e intuitivo. Sin transiciones largas. Ritmo ágil.

| Escena / Acción en Pantalla | Locución (Voz en Off) |
| :--- | :--- |
| **0:00 - 0:05 \| El Problema & La Solución**<br>*Visual:* Dashboard inicial de Clinic Flow 360. Animación de zoom in. | *"Gestionar una clínica dental no debería ser complicado. Descubre Clinic Flow 360, el software inteligente que transforma tu flujo de trabajo."* |
| **0:05 - 0:15 \| Citas y Pacientes**<br>*Visual:* Vista de calendario de citas. Clic fluido para abrir el expediente de un paciente. | *"Organiza tu agenda sin esfuerzo. Accede al historial completo de tus pacientes en un solo clic, desde cualquier lugar."* |
| **0:15 - 0:25 \| Iniciar Consulta**<br>*Visual:* Botón de "Iniciar Consulta" pulsado. Transición rápida a la interfaz de consulta activa. | *"Inicia la consulta en tiempo real. Nuestra interfaz está diseñada por y para profesionales de la salud dental."* |
| **0:25 - 0:40 \| El Odontograma**<br>*Visual:* Vista general del Odontograma. Zoom a un diente (ej. Pieza 17). | *"El corazón de tu clínica: un odontograma interactivo, anatómicamente preciso y fácil de usar. Visualiza el estado general al instante."* |
| **0:40 - 0:55 \| Diagnóstico y Planes**<br>*Visual:* Clic en la cara oclusal del diente. Se abre el modal. Se asigna un ICDAS 5, el color cambia a rojo. Se añade un plan de tratamiento. | *"Registra hallazgos, aplica diagnósticos ICDAS, y crea planes de tratamiento en segundos. Todo el historial clínico se actualiza de forma automática."* |
| **0:55 - 1:00 \| Cierre (Call to Action)**<br>*Visual:* El logotipo de Clinic Flow 360 sobre fondo corporativo con la URL de la web. | *"Lleva tu práctica al siguiente nivel. Moderniza tu clínica hoy con Clinic Flow 360."* |

---

## 4. Prompts Útiles (Para Gemini Advanced / Gemini 1.5 Pro)

Como tienes Google One Pro, usa Gemini Advanced para generar variaciones de texto o ideas de marketing.

**Prompt para generar variaciones del Guion:**
> *"Actúa como un experto en marketing de software B2B para clínicas dentales. Tengo un guion de 60 segundos para el video promocional de 'Clinic Flow 360', un SaaS moderno y rápido. Aquí está el guion actual: [PEGA EL GUION ARRIBA]. Por favor, reescríbelo en 3 tonos diferentes: 1) Más profesional y clínico, 2) Más enfocado en ahorrar tiempo (para dueños ocupados), y 3) Más enfocado en la tecnología y modernidad."*

**Prompt para sugerencias de textos de apoyo en pantalla (B-Roll Text):**
> *"Voy a editar un video promocional de software odontológico. Necesito 5 frases cortas e impactantes (máximo 4 palabras cada una) para que aparezcan en pantalla como textos de apoyo mientras muestro el módulo de: Citas, Historial Clínico, y el Odontograma interactivo."*

**Prompt para generar la descripción del video en YouTube/LinkedIn:**
> *"Escribe una descripción SEO optimizada para YouTube y LinkedIn para el video de demostración de 'Clinic Flow 360'. Destaca características clave como: gestión de citas, expediente electrónico, odontograma interactivo y facilidad de uso. Incluye hashtags relevantes y una llamada a la acción para agendar una demostración."*
