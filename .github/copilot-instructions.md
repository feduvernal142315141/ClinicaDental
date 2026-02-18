# Copilot Instructions - front-clinic

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

## 3) Required Conventions / Convenciones Obligatorias
- Prefer alias imports with `@/...`.
- Prefer public module exports (barrels) when available.
- Do not use `components/legacy/*` for new code.
- Ignore transpiled legacy auth artifacts in `components/features/auth/**/dist/*`.
- Reuse existing wrappers/hooks before creating new abstractions.

## 4) Domain Rules / Reglas de Dominio
- `doctor` endpoints represent system users (not only clinical doctors).
- Date format: `YYYY-MM-DD`.
- Time format: `HH:mm`.
- Permissions must use `usePermission` + `PermissionAction`.

## 5) Auth and Session / Autenticacion y Sesion
- Auth flow is OTP + JWT.
- Session/token flow combines Next route handlers (`/api/auth/*`), cookies, and localStorage helpers.
- Respect existing token/cookie helpers in `lib/auth/*` and `lib/auth/server/*`.

## 6) Environment / Entorno
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_AUTH_DEBUG`

## 7) Standard Commands / Comandos Estandar
- `npm run dev`
- `npm run lint`
- `npm run build`

## 8) Output Style / Estilo de Salida
- UI copy and user-facing text should be in Spanish.
- Technical symbols, code identifiers, and API naming stay in English.
- Avoid introducing new `any`; keep typings explicit and aligned with `lib/entity`.
