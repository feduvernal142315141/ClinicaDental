---
name: front-clinic-feature-flow
description: Use when implementing or extending a standard feature in front-clinic outside legacy code. This skill applies the repo architecture for pages, feature components, hooks, services, entities, permissions, and barrel exports, and keeps Spanish UI copy, typed contracts, and existing wrappers consistent.
---

# Front Clinic Feature Flow

## Use this skill when

- You are creating a new feature or extending an existing one.
- You need to add or change `page + component + hook + service + entity` files.
- You need to add a service and hook layer for a backend endpoint.
- You need to wire permissions, UX messages, and typed API contracts consistently.

## Do not use this skill when

- The task is confined to the odontogram module. Use `/odontogram-module` instead.
- The task is a tiny localized bugfix with no architecture impact.

## Read first

1. `.github/copilot-context.md`
2. `.github/prompts/crear-feature.prompt.md`
3. `.github/prompts/crear-servicio-hook.prompt.md`
4. Existing files in the target feature folder

## Standard architecture

- Pages: `app/(authenticated)/*`
- Feature UI: `components/features/<feature>/*`
- Feature hooks: `lib/hooks/<feature>/*`
- Service layer: `lib/services/<feature>/*`
- Typed entities: `lib/entity/*`
- Shared wrappers: `components/ui/antd/*` and `components/ui/atomic/*`

## Working rules

1. Inspect nearby feature files before creating anything new.
2. Reuse existing wrappers, hooks, table/form components, and barrels.
3. Prefer alias imports with `@/...`.
4. Use service helpers from `lib/services/baseService.ts`:
   - `serviceGet`
   - `servicePost`
   - `servicePut`
   - `serviceDelete`
   - `servicePatch`
5. Hooks should surface UX errors through `App.useApp().message`.
6. Permissions must use `usePermission` plus `PermissionAction`.
7. Keep UI copy in Spanish and technical identifiers in English.
8. Avoid new `any` values when a typed contract can be added in `lib/entity/*`.
9. Update barrel exports when adding public files.
10. Do not add new code under `components/legacy/*`.

## Validation checklist

- Files are placed in the correct layer
- Request and response types are defined or extended in `lib/entity/*`
- Hook and service names follow existing patterns
- Error handling is consistent
- Imports use aliases and barrels when available

## Response checklist

- Files created or updated
- Short summary of the contract shape
- Manual validation steps
- Suggested `npm run lint` and `npm run build` checks
