# Copilot Instructions - front-clinic

## Evidence Policy
- Derive rules from the current repository, not from generic frontend templates.
- Read `package.json`, `next.config.mjs`, `tsconfig.json`, and the nearest implementation files before proposing changes.
- Prefer current code over docs when they conflict.
- Treat `README.md` as non-authoritative until it is replaced with real project guidance.
- Prefer the reusable assets in `.github/instructions/*`, `.github/prompts/*`, and `.github/skills/*` when they match the task.

## Verified Repository Snapshot
- App Router is the active routing model: routes live under `app/*` and no `pages/*` tree is present.
- `app/layout.tsx` is a server layout that delegates providers and shell composition to `components/layout/root-client.tsx`.
- Route handlers exist under `app/api/auth/*`.
- The stack is Next.js 15, React 18, and TypeScript with `strict: true`.
- The package manager is Yarn 1 (`packageManager` plus `yarn.lock`).
- Ant Design is registered through `@ant-design/nextjs-registry` in `components/layout/root-client.tsx`.
- Ant Design is wrapped locally in `components/ui/antd/*`, while other areas also use `components/ui/atomic/*` and `components/ui/primitives/shadcn/*`.
- Frontend HTTP access is centered on Axios via `lib/services/apiConfig.ts` and `lib/services/baseService.ts`.
- No active repo-wide i18n library was detected in the current codebase.
- No Jest, Vitest, Playwright, or Cypress setup was detected.
- `next.config.mjs` currently ignores TypeScript and ESLint build errors; still write type-safe, lint-friendly code.

## Architecture Guardrails
- Use App Router conventions only. Do not propose Pages Router files or patterns unless the repo changes first.
- Preserve the rendering model of the touched files. Many pages and most UI files are already client components, while layouts like `app/layout.tsx` and `app/(authenticated)/layout.tsx` remain server components.
- Keep route handlers in `app/api/*`.
- Reuse the local structure of the touched feature. This repo is mixed:
  - feature UI commonly lives in `components/features/*`
  - services live in `lib/services/*`
  - typed entities live in `lib/entity/*`
  - hooks may be centralized in `lib/hooks/*` or colocated inside a feature folder
- Do not move remote access directly into UI code when the feature already uses a service, adapter, hook, or route-handler boundary.
- Keep changes compatibility-first. Preserve route behavior, exported contracts, and current provider composition unless a change is explicitly required.

## UI Guardrails
- Reuse `components/ui/antd/*` wrappers before introducing raw Ant Design in AntD-based areas.
- If the touched feature already uses `components/ui/atomic/*` or `components/ui/primitives/shadcn/*`, stay consistent with that feature instead of mixing UI vocabularies arbitrarily.
- Preserve the shell and provider patterns anchored by `components/layout/root-client.tsx` and `components/ui/antd/layout/AppShellAntd.tsx`.
- Keep user-facing copy in Spanish unless the surrounding screen already uses another language.
- Preserve the feature's current empty, loading, and feedback patterns.

## Data, Typing, and Compatibility
- Prefer alias imports with `@/...`.
- Prefer typed contracts in `lib/entity/*` and extend them before adding new `any`.
- Use `serviceGet`, `servicePost`, `servicePut`, `serviceDelete`, and `servicePatch` from `lib/services/baseService.ts` when working in the existing service layer.
- Preserve the interceptor and notification assumptions implemented in `lib/services/apiConfig.ts`.
- Do not invent repo-wide i18n files, locale folders, or translation hooks that are not present.
- Where existing contracts expect them, keep date strings as `YYYY-MM-DD` and time strings as `HH:mm`.

## Critical Shared Workflows
- Permissions should use `usePermission` and `PermissionAction`.
- Auth is OTP + JWT, with refresh routed through `/api/auth/refresh` and cookie helpers under `lib/auth/server/*`.
- The odontogram is an embedded module with an adapter-first boundary:
  - public module API in `lib/odontogram/*`
  - specialized module UI in `components/features/odontogram/*`
  - host integration in wrappers such as `components/features/patients/detail/PatientOdontogramPanel.tsx`
- Do not leak host-only services, contexts, routing, or page shell concerns into `lib/odontogram/*`.

## Validation
- Preferred commands:
  - `yarn dev`
  - `yarn lint`
  - `yarn build`
- Equivalent `npm run dev`, `npm run lint`, and `npm run build` commands are acceptable when contributors use npm.
- Because no automated test runner is currently configured, do not claim automated coverage unless you also add the tooling explicitly.
