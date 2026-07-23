# Tecnología

## Runtime y construcción

| Área | Tecnología verificada | Regla |
|---|---|---|
| Framework | Next.js `15.5.19`, App Router | usar `app/*`; no crear `pages/*` |
| Vista | React 18 | conservar el modelo server/client del área tocada |
| Lenguaje | TypeScript 5, `strict: true` | extender tipos antes de usar `any` |
| Gestor | Yarn 1.22.22 | mantener `yarn.lock`; no mezclar lockfiles |
| Desarrollo | Turbopack por defecto | `yarn dev`; Webpack solo con `yarn dev:webpack` |
| Estilos | Tailwind CSS 4 + PostCSS | reutilizar tokens de `app/globals.css` |
| Salida productiva | `.next-build` | `yarn build` y `yarn start` usan `NEXT_DIST_DIR` |

El README fija Node.js 18.18 o superior como mínimo operativo. La versión exacta
de Node debe fijarse en la plataforma de despliegue; el repositorio no contiene
todavía `.nvmrc`, `.node-version` ni campo `engines`.

## UI y experiencia

- Sistema preferido para desarrollo nuevo: primitivas locales exportadas por
  `components/ui/index.ts`, Radix/shadcn, controles de
  `components/ui/controls/*` y tokens Bento.
- Compatibilidad existente: Ant Design 6 y wrappers en
  `components/ui/antd/*`. No migrar una pantalla completa como efecto lateral.
- Temas: `next-themes`, Radix Themes y tokens semánticos claros/oscuros.
- Iconos: `lucide-react`.
- Tipografía: Geist Sans y Geist Mono.
- Feedback: Sileo mediante `lib/utils/notify.ts`; existen componentes de toast
  anteriores, pero no deben expandirse sin revisar el patrón vecino.
- Gráficos: Recharts.
- Edición enriquecida: Tiptap.

## Formularios y validación

- React Hook Form.
- Zod 3 y `@hookform/resolvers`.
- Primitivas compartidas en `lib/validation/fields.ts`.
- Componentes accesibles en `components/ui/atomic/forms/*`.

La guía detallada está en
[`docs/technical/form-validation-standard.md`](../technical/form-validation-standard.md).

## Estado y acceso a datos

- Context API para auth, alertas, branding e interceptores.
- Zustand 5 para el odontograma, consulta activa y estado de autosave.
- Axios como cliente HTTP central en `lib/services/apiConfig.ts`.
- Helpers de transporte en `lib/services/baseService.ts`.
- No hay TanStack Query, Redux ni una capa GraphQL activa.

## Seguridad e integración

- Autenticación OTP + JWT.
- Route handlers Next.js para crear, refrescar y cerrar la sesión.
- RSA con JSEncrypt como defensa adicional del password sobre TLS.
- `@vercel/analytics` está integrado, pero su presencia no demuestra que el
  hosting actual sea Vercel.
- Cloudinary se consume a través del backend; el frontend no debe recibir sus
  credenciales.

## Herramientas presentes y ausentes

Presentes: ESLint 8, TypeScript, Knip y scripts de generación internos.

No detectados: Jest, Vitest, React Testing Library, Playwright, Cypress,
Storybook, Dockerfile, configuración de CI/CD o herramienta repo-wide de i18n.
No asumir esas capacidades en una tarea.
