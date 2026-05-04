# Clinic Flow 360

![Clinic Flow 360](public/favicon.ico) <!-- Placeholder para un logo real -->

**Clinic Flow 360** es un moderno software SaaS de gestión clínica odontológica enfocado en la experiencia de usuario (UX) y el rendimiento. Provee un ecosistema completo que incluye agendamiento inteligente, historias clínicas, y un **odontograma interactivo en tiempo real**.

Este repositorio contiene el código fuente tanto del Frontend (Next.js) como del Backend (Spring Boot).

---

## 🛠️ Stack Tecnológico

### Frontend (`/front-clinic`)
- **Framework:** Next.js 15 (App Router)
- **Librería UI:** React 18
- **Estilos:** Tailwind CSS + Radix UI / Shadcn UI
- **Componentes Complejos:** Ant Design (`@ant-design/nextjs-registry`)
- **Estado Global:** Zustand
- **Peticiones HTTP:** Axios

### Backend (`/backend-clinic`)
- **Lenguaje:** Java 21
- **Framework:** Spring Boot 3.x
- **Arquitectura:** CQRS / Mediator Pattern (Controladores delgados)
- **Persistencia:** Spring Data JPA + PostgreSQL
- **Seguridad:** Spring Security (JWT + OTP)

---

## 🚀 Guía de Instalación Local

Sigue estos pasos para levantar el entorno completo de desarrollo en tu máquina local.

### 1. Prerrequisitos
Asegúrate de tener instalado:
- [Node.js](https://nodejs.org/) (v18 o superior)
- [Yarn](https://yarnpkg.com/) (Gestor de paquetes del frontend)
- [Java Development Kit (JDK) 21](https://adoptium.net/)
- [Docker](https://www.docker.com/) y Docker Compose (Para la base de datos)

### 2. Levantar la Base de Datos (PostgreSQL)
El backend requiere una base de datos PostgreSQL. Utiliza Docker para levantar el contenedor preconfigurado:
```bash
# Navega al directorio del backend o donde se encuentre el docker-compose.yml
cd backend-clinic
docker-compose up -d
```
*(Asegúrate de que el puerto 5432 esté libre).*

### 3. Configurar e Iniciar el Backend
El backend utiliza Maven Wrapper (`mvnw`), por lo que no necesitas tener Maven instalado globalmente.

```bash
# Desde la raíz del proyecto, entra al backend
cd backend-clinic

# Ejecuta el servidor con el perfil local
./mvnw spring-boot:run -Dspring-boot.run.profiles=local
```
El servidor backend estará disponible en: `http://localhost:8080`

### 4. Configurar e Iniciar el Frontend
El frontend se ejecuta con Yarn y requiere instalar las dependencias primero.

```bash
# Abre una nueva pestaña en tu terminal y entra al frontend
cd front-clinic

# Instala las dependencias
yarn install

# Inicia el servidor de desarrollo
yarn dev
```
La aplicación web estará disponible en: `http://localhost:3000`

---

## 🏗️ Arquitectura y Reglas del Proyecto (Workspace UX Core)

Para mantener la calidad y consistencia del código, sigue estas reglas estrictas:

1. **Obsidian Vault (SSOT):** Antes de tomar decisiones arquitectónicas, consulta siempre el *Obsidian Vault* local (Single Source of Truth).
2. **Backend Thin Controllers:** NUNCA coloques lógica de negocio en los controladores de Spring Boot. Toda la lógica debe delegarse al mediador (`mediator.send()`).
3. **Frontend Routing:** Utiliza estrictamente *Next.js 15 App Router*. No introduzcas librerías de enrutamiento de terceros.
4. **Odontograma:** El estado del odontograma se maneja localmente de forma aislada mediante Zustand (`lib/odontogram/store.tsx`) y usa un patrón Adapter para la persistencia.

---

## 🐞 Solución de Problemas Comunes

- **Error de conexión a la BD:** Verifica que el contenedor de Docker `backend-clinic-postgres-1` esté corriendo (`docker ps`).
- **Problemas de Caché en Next.js:** Si el frontend se comporta extraño tras un cambio grande, elimina la carpeta `.next/` y vuelve a correr `yarn dev`.

> **Nota para Desarrolladores:** Ante cualquier duda sobre contratos de API o flujos de UI, consulta los archivos `API_CONTRACT.md` y `FRONTEND_FLOW.md` en la raíz del monorepo.