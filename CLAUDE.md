# CLAUDE.md — front-clinic

Sub-repo **Next.js 15 App Router, TypeScript**. Repo git propio; commits a **`develop`** (skill `commit-flow`). Doc raíz: `../CLAUDE.md`. Convenciones detalladas:

@AGENTS.md
@components/AGENTS.md

## Verificar (skill `verify-front`)
```bash
npx tsc --noEmit 2>&1 | grep -c "error TS"   # baseline 157 — NO debe subir
yarn build                                     # esperado: ✓ Compiled + Generating static pages (34/34)
ESLINT_USE_FLAT_CONFIG=false npx eslint <archivos-tocados>   # sin nuevas violaciones
yarn dev                                       # next dev --turbopack
```
`next.config.mjs` ignora errores TS/ESLint en build → el `tsc` y el lint manual son los que mandan.

## Reglas (no negociables)
- Capas: `page.tsx → component → hook → service → entity`. HTTP **solo** en `lib/services/*` (Axios `baseService`); tipos en `lib/entity/*`.
- **UI 2026 Bento**: `@/components/ui` (Radix/shadcn/atomic + controles). **Prohibido antd en código nuevo.** Toasts `notify` (sonner), iconos `lucide-react`, copy en **español**.
- Forms: **react-hook-form + zod**, validación onBlur 3 estados, floating labels, WCAG 2.2.
- Tokens semánticos (`canvas/surface/ink/brand/subtle/hairline/rounded-bento`). Fechas `YYYY-MM-DD`/`HH:mm`, inputs en hora LOCAL (`lib/datetime.ts`).
- Datos solo-cliente (storage) → leer en `useEffect`, **nunca en render** (hidratación).

Agentes: `frontend-feature`, `odontogram-specialist`, `antd-migrator`. Skills: `front-clinic-feature-flow`, `auth-ui-2026`, `odontogram-*`, `verify-front`, `commit-flow`.
