# AGENTS.md for `components/*`

Use this guidance when editing presentation code under `components/*`.

## UI Rules
- Reuse the local UI vocabulary of the touched feature.
- In AntD-based areas, prefer `components/ui/antd/*` wrappers before introducing raw Ant Design.
- In atomic or shadcn-based areas, stay consistent with the existing primitives instead of mixing vocabularies arbitrarily.
- Preserve shell and provider assumptions anchored by `components/layout/root-client.tsx` and `components/ui/antd/layout/AppShellAntd.tsx`.
- Keep visible copy in Spanish unless the surrounding screen already uses another language.

## Behavior Rules
- Keep pure UI components thin. Do not move service calls into presentation components when a hook, adapter, or route-handler boundary already exists.
- Reuse nearby patterns for forms, tables, modals, drawers, tabs, typography, and feedback components.
- Respect permissions before exposing actions. Prefer `usePermission` and `PermissionAction`.
- Preserve feature-level loading, empty, and feedback states.

## Special Cases
- If the touched component integrates the odontogram with a host screen, keep module boundary rules from `lib/odontogram/*` intact.
- Avoid adding new code under `components/legacy/*` unless the task explicitly targets legacy code.

## Validation
- Run `yarn lint` when practical.
- Manually smoke-test the affected component in its route context.
