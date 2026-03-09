# Copilot Instructions - front-clinic

## 0) Required Context Files / Archivos de Contexto
- Read `.github/copilot-context.md` before proposing changes.
- Prefer reusable prompt templates in `.github/prompts/*.prompt.md`.
- If code and docs conflict, treat current code as source of truth.

## 1) Project Identity / Identidad del Proyecto
- This is a Next.js 15 App Router project with TypeScript (`strict: true`).
- Este proyecto usa Ant Design + Tailwind CSS + Radix UI.
- HTTP/API access is implemented through Axios service layers in `lib/services`.
- Build currently ignores TypeScript and ESLint errors in `next.config.mjs`; still write type-safe and lint-friendly code.

## 2) Real Architecture / Arquitectura Real
- Protected pages: `app/(authenticated)`
- Domain UI: `components/features/<feature>`
- Domain hooks: `lib/hooks/<feature>`
- API/service layer: `lib/services/<feature>`
- Types/entities: `lib/entity/*`
- Shared UI wrappers: `components/ui/antd` and `components/ui/atomic`
- Internal feature modules may expose their own isolated domain layer under `lib/<feature>`.
- Current internal module example: odontogram uses `lib/odontogram` for state, adapters and module API.

## 3) Required Conventions / Convenciones Obligatorias
- Prefer alias imports with `@/...`.
- Prefer public module exports (barrels) when available.
- Do not use `components/legacy/*` for new code.
- Ignore transpiled legacy auth artifacts in `components/features/auth/**/dist/*`.
- Reuse existing wrappers/hooks before creating new abstractions.
- Do not propose monorepo or runtime microfrontend changes unless explicitly requested.

## 4) Domain Rules / Reglas de Dominio
- `doctor` endpoints represent system users (not only clinical doctors).
- Date format: `YYYY-MM-DD`.
- Time format: `HH:mm`.
- Permissions must use `usePermission` + `PermissionAction`.
- User-facing UI text must remain in Spanish.

## 5) Auth and Session / Autenticacion y Sesion
- Auth flow is OTP + JWT.
- Session/token flow combines Next route handlers (`/api/auth/*`), cookies, and localStorage helpers.
- Respect existing token/cookie helpers in `lib/auth/*` and `lib/auth/server/*`.

## 6) Odontogram Module / Modulo Odontograma
- Source of truth is now inside this repo, not in an external monorepo package.
- Public module entrypoints live in `lib/odontogram/index.ts` and `lib/odontogram/OdontogramModule.tsx`.
- Specialized odontogram UI lives in `components/features/odontogram/*`.
- Module state and persistence must stay adapter-first:
  - state/store in `lib/odontogram/store.tsx`
  - persistence adapters in `lib/odontogram/adapters/*`
- The odontogram module must not import host-only concerns such as:
  - `lib/services/*`
  - `lib/contexts/*`
  - routing/navigation from app pages
  - page/layout shell components
- Host integration with patients must happen through wrapper components such as `components/features/patients/detail/PatientOdontogramPanel.tsx`.
- Do not reintroduce hardcoded context values like `current-user` or `current-visit`; author/visit context must come from props, metadata or adapters.

## 7) Environment / Entorno
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_AUTH_DEBUG`

## 8) Standard Commands / Comandos Estandar
- `npm run dev`
- `npm run lint`
- `npm run build`

## 9) Output Style / Estilo de Salida
- UI copy and user-facing text should be in Spanish.
- Technical symbols, code identifiers, and API naming stay in English.
- Avoid introducing new `any`; keep typings explicit and aligned with `lib/entity`.
