---
name: front-clinic-feature-flow
description: Use when implementing or extending a standard feature in front-clinic outside legacy code. This skill keeps Spanish UI copy, typed contracts, permissions, wrappers, and service boundaries aligned with the repo's actual patterns.
---

# Front Clinic Feature Flow

## When to use this skill
- You are creating a new feature or extending an existing one outside legacy code.
- You need to add or change a route, feature component, service, entity, permission wiring, or hook layer.
- The task is not limited to the odontogram module.

## Requirements
- Read `AGENTS.md` plus any nested `AGENTS.md` files in the target path.
- Inspect the nearest route, feature folder, entities, services, wrappers, and permission checks first.

## References
- `app/(authenticated)/*`
- `components/features/*`
- `components/ui/antd/*`
- `components/ui/atomic/*`
- `lib/services/*`
- `lib/entity/*`

## Workflow
1. Inspect nearby feature files before creating anything new.
2. Match the local pattern instead of forcing a single architecture shape.
3. Reuse existing wrappers, hooks, table or form components, and barrel exports.
4. Use the existing service layer and typed entities when backend access is involved.
5. Wire permissions with `usePermission` and `PermissionAction` where actions are protected.
6. Keep UI copy in Spanish and technical identifiers in English.

## Validation
- Files are placed in the appropriate layer for that feature
- Request and response types are defined or extended in `lib/entity/*`
- Error handling is consistent with nearby code
- Imports use `@/...` and existing barrels when available
- Suggested checks: `yarn lint` and `yarn build` when shared or route-level code changes

## Good example
- Extend a patients or appointments feature by matching its existing screen structure, reusing current wrappers, and adding only the service and types needed for the new behavior.

## What to avoid
- Forcing every feature into a generic `page -> component -> hook -> service -> entity` chain when the touched area already uses colocated hooks or another stable local pattern
- Adding new code under `components/legacy/*`
- Bypassing permissions or service boundaries
