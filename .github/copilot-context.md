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
- Internal isolated modules can live under `lib/<feature>` when they need local domain/state contracts.
- Current case: odontogram is integrated as an internal module, not as monorepo package or microfrontend.

## 3) Flow Pattern To Reuse
- Preferred flow: `page.tsx` -> feature component -> feature hook -> service -> entity types.
- Services should use `serviceGet/servicePost/servicePut/serviceDelete` when possible.
- Hooks should handle UX errors with `App.useApp().message`.
- Keep route navigation in page/hooks, not inside pure UI components.
- Module-first exception:
- `host wrapper` -> `lib/<feature>/PublicModule` -> internal feature UI/components
- Use this pattern when the module must be embeddable and independently testable inside the repo.

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

## 6) Odontogram Architecture
- UI shell and odontogram specialized visuals live in `components/features/odontogram/*`.
- Public API and module state live in:
  - `lib/odontogram/index.ts`
  - `lib/odontogram/OdontogramModule.tsx`
  - `lib/odontogram/store.tsx`
  - `lib/odontogram/adapters/*`
- Current patient host wrapper:
  - `components/features/patients/detail/PatientOdontogramPanel.tsx`
- Current patient integration points:
  - `components/features/patients/detail/PatientDetail.tsx`
  - `components/features/patients/detail/PatientDetails.tsx`
  - `components/features/patients/views/PatientTabs.tsx`
- Design rule:
  - odontogram logic must not depend on `lib/services`, auth contexts, route handlers or page shell components
  - host-specific permissions, toasts and persistence adapters are injected from wrappers
- Data rule:
  - adapter-first persistence
  - local storage adapter is only a first phase
  - future API integration should replace the adapter, not the module UI/state
- Context rule:
  - never hardcode author or visit identifiers
  - use metadata, props or adapter-provided context instead

## 7) Import and File Rules
- Prefer alias imports `@/...`.
- Prefer barrel exports (`index.ts`) when available.
- Do not add new code under `components/legacy/*`.
- Ignore generated legacy artifacts in `components/features/auth/**/dist/*`.

## 8) Current Project Realities
- `next.config.mjs` currently ignores type and eslint errors during build.
- Even with relaxed build, generated code should remain type-safe and lint-friendly.
- Keep changes minimal, atomic, and consistent with existing module style.
- The repo currently has unrelated pre-existing type and dependency issues outside odontogram.
- When validating odontogram work, separate module-specific errors from global project debt.

## 9) Practical Guardrails For Copilot
- First search for similar implementations in the same feature before creating abstractions.
- Do not introduce new `any` unless there is a hard technical reason.
- When refactoring, preserve API contracts and route behavior unless explicitly requested.
- If backend endpoint behavior is uncertain, keep compatibility comments and defensive handling.
- Do not suggest extracting odontogram back to another repo as the default next step.
- Prefer strengthening the internal module boundary before proposing external packaging.

## 10) High-Value Reference Files
- `lib/services/baseService.ts`
- `lib/services/apiConfig.ts`
- `lib/hooks/use-permission.ts`
- `lib/permissions/permission-actions.ts`
- `lib/odontogram/index.ts`
- `lib/odontogram/OdontogramModule.tsx`
- `lib/odontogram/store.tsx`
- `lib/odontogram/adapters/local-storage.ts`
- `components/features/patients/detail/PatientOdontogramPanel.tsx`
- `components/features/appointments/*`
- `app/(authenticated)/*`
