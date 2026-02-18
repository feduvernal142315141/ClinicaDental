# Copilot Project Context - front-clinic

## 1) Stack Snapshot
- Next.js 15 App Router (`app/`), React 18, TypeScript `strict: true`.
- UI stack: Ant Design + Tailwind CSS + Radix UI.
- HTTP layer: Axios instance in `lib/services/apiConfig.ts` + helpers in `lib/services/baseService.ts`.
- Lint/build commands:
- `npm run dev`
- `npm run lint`
- `npm run build`

## 2) Real Architecture Map
- Protected pages live in `app/(authenticated)`.
- Feature UI lives in `components/features/<feature>`.
- Domain hooks live in `lib/hooks/<feature>`.
- Service layer lives in `lib/services/<feature>`.
- Typed entities live in `lib/entity/*`.
- Reusable UI wrappers live in `components/ui/antd` and `components/ui/atomic`.

## 3) Flow Pattern To Reuse
- Preferred flow: `page.tsx` -> feature component -> feature hook -> service -> entity types.
- Services should use `serviceGet/servicePost/servicePut/serviceDelete` when possible.
- Hooks should handle UX errors with `App.useApp().message`.
- Keep route navigation in page/hooks, not inside pure UI components.

## 4) Auth, Session, and Permissions
- Auth flow is OTP + JWT.
- Session refresh is handled by `/api/auth/refresh` and axios interceptors.
- Global route guards are in `middleware.ts`.
- Permissions must use `usePermission` + `PermissionAction`.
- Admin shortcut is valid (`roleName === "admin"`).

## 5) Domain and Data Rules
- Date format: `YYYY-MM-DD`.
- Time format: `HH:mm`.
- User-facing copy must be Spanish.
- Technical identifiers stay in English.
- `doctor` endpoints represent system users (not only clinical doctors).

## 6) Import and File Rules
- Prefer alias imports `@/...`.
- Prefer barrel exports (`index.ts`) when available.
- Do not add new code under `components/legacy/*`.
- Ignore generated legacy artifacts in `components/features/auth/**/dist/*`.

## 7) Current Project Realities
- `next.config.mjs` currently ignores type and eslint errors during build.
- Even with relaxed build, generated code should remain type-safe and lint-friendly.
- Keep changes minimal, atomic, and consistent with existing module style.

## 8) Practical Guardrails For Copilot
- First search for similar implementations in the same feature before creating abstractions.
- Do not introduce new `any` unless there is a hard technical reason.
- When refactoring, preserve API contracts and route behavior unless explicitly requested.
- If backend endpoint behavior is uncertain, keep compatibility comments and defensive handling.

## 9) High-Value Reference Files
- `lib/services/baseService.ts`
- `lib/services/apiConfig.ts`
- `lib/hooks/use-permission.ts`
- `lib/permissions/permission-actions.ts`
- `components/features/appointments/*`
- `app/(authenticated)/*`
