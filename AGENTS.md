# AGENTS.md

This file is the root Codex instruction surface for `front-clinic`.

## Authority and Context
- Derive guidance from the current repository, not from generic frontend templates.
- Read `package.json`, `next.config.mjs`, `tsconfig.json`, and the nearest implementation files before proposing changes.
- Prefer current code over stale docs when they conflict.
- Treat `.github/*` as supplementary context. For Codex in this repo, `AGENTS.md` files and `.agents/skills/*` are the primary instruction surface.
- Use repo skills from `.agents/skills/*` when the task matches them.
- Use `docs/development/*` as the maintained technical reference for technology, architecture, standards, contracts, data, security, deployment, and quality.

## Verified Repository Snapshot
- Next.js 15 App Router is active under `app/*`; there is no `pages/*` tree.
- `app/layout.tsx` is a server layout that delegates providers and shell composition to `components/layout/root-client.tsx`.
- Route handlers exist under `app/api/auth/*`.
- The stack is React 18 plus TypeScript with `strict: true`.
- Yarn 1 is present via `packageManager` and `yarn.lock`.
- The UI stack is mixed:
  - Ant Design with local wrappers in `components/ui/antd/*`
  - local atomic and shadcn-style primitives in `components/ui/atomic/*` and `components/ui/primitives/shadcn/*`
- Frontend HTTP access is centered on Axios via `lib/services/apiConfig.ts` and `lib/services/baseService.ts`.
- No active repo-wide i18n library was detected.
- No Jest, Vitest, Playwright, or Cypress setup was detected.
- `next.config.mjs` currently ignores TypeScript and ESLint build errors; still write type-safe, lint-friendly code.

## Repo-Wide Working Defaults
- Preserve the current rendering model of touched files. This repo intentionally mixes server layouts with many client pages and components.
- Use App Router conventions only unless the repo architecture changes first.
- Prefer alias imports with `@/...`.
- Keep user-facing UI copy in Spanish unless the surrounding screen already uses another language.
- Prefer typed contracts in `lib/entity/*` and extend them before introducing new `any`.
- Keep changes compatibility-first. Preserve route behavior, exported contracts, provider composition, and established async boundaries unless a change is explicitly required.
- Do not invent repo-wide i18n files, locale folders, translation hooks, or unsupported tooling.

## Architecture Guardrails
- Reuse the local structure of the touched area. This repo is mixed:
  - feature UI commonly lives in `components/features/*`
  - services live in `lib/services/*`
  - typed entities live in `lib/entity/*`
  - hooks may be centralized in `lib/hooks/*` or colocated inside a feature folder
- Do not move remote access directly into UI code when the feature already uses a service, adapter, hook, or route-handler boundary.
- Reuse `components/ui/antd/*` wrappers before introducing raw Ant Design in AntD-based areas.
- If a touched feature already uses atomic or shadcn-style primitives, stay consistent with that feature instead of mixing vocabularies arbitrarily.
- Keep date strings as `YYYY-MM-DD` and time strings as `HH:mm` where existing contracts expect them.

## Critical Shared Workflows
- Permissions should use `usePermission` and `PermissionAction`.
- Auth is OTP plus JWT, with refresh routed through `/api/auth/refresh` and cookie helpers under `lib/auth/server/*`.
- The odontogram is an embedded module with a module boundary:
  - public module API, store, domain logic, and adapters live in `lib/odontogram/*`
  - specialized module UI lives in `components/features/odontogram/*`
  - host integration belongs in wrappers such as `components/features/patients/detail/PatientOdontogramPanel.tsx`
- Keep host-only UI, contexts, routing, and page-shell concerns out of `lib/odontogram/*`.
- Persistence bridging for the odontogram belongs in adapters. Adapter files may call the existing odontogram service bridge when needed.

## Validation
- Preferred commands:
  - `yarn dev`
  - `yarn lint`
  - `yarn build`
- Equivalent `npm run dev`, `npm run lint`, and `npm run build` commands are acceptable when a contributor is using npm.
- Because no automated test runner is currently configured, do not claim automated coverage unless you also add the tooling explicitly.

## Available Repo Skills
- `$clinic-flow-development`
- `$add-feature`
- `$fix-bug`
- `$refactor-component-or-module`
- `$refactor-hook-or-state-logic`
- `$code-review`
- `$atomic-commits`
- `$front-clinic-feature-flow`
- `$odontogram-module`
