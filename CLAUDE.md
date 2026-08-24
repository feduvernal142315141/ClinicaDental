# CLAUDE.md — front-clinic

Sub-repo **Next.js 15 App Router, TypeScript**. Repo git propio; commits a **`develop`** (skill `commit-flow`). Doc raíz: `../CLAUDE.md`. Este archivo es la **única** instrucción permanente del sub-repo: si algo no está aquí, está en el código o en una skill.

## Verificar (skill `verify-front` — ahí viven los baselines, no aquí)
```bash
npx tsc --noEmit 2>&1 | grep -c "error TS"   # no debe subir
yarn build                                     # ✓ Compiled + Generating static pages
yarn lint                                      # sin errores ni warnings nuevos
yarn dev                                       # next dev --turbopack
```
`next.config.mjs` ignora errores TS/ESLint en build → el `tsc` y el lint manual son los que mandan.

## Reglas (no negociables)
- Capas: `page.tsx → component → hook → service → entity`. HTTP **solo** en `lib/services/*` (Axios `baseService`); tipos en `lib/entity/*`.
- **UI 2026 Bento**: `@/components/ui` (Radix/shadcn/atomic + controles). **Prohibido antd en código nuevo.** Toasts `notify` (Sileo), iconos `lucide-react`, copy en **español**.
- Forms: **react-hook-form + zod**, validación onBlur 3 estados, floating labels, WCAG 2.2.
- Tokens semánticos (`canvas/surface/ink/brand/subtle/hairline/rounded-bento`). Fechas `YYYY-MM-DD`/`HH:mm`, inputs en hora LOCAL (`lib/datetime.ts`).
- Datos solo-cliente (storage) → leer en `useEffect`, **nunca en render** (hidratación).
- Integración server-side vía **route handlers** en `app/api/*`. No sustituir un flujo existente por server actions (decisión de stack, no accidente).

Agentes: `frontend-feature`, `odontogram-specialist`, `antd-migrator`. Skills: `front-clinic-feature-flow`, `auth-ui-2026`, `odontogram-*`, `verify-front`, `commit-flow`.
