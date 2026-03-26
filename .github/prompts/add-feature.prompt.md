---
description: Add or extend a feature in front-clinic using the repository's real App Router, UI, and data patterns.
argument-hint: "<feature goal> [route or folder]"
---

Act as a senior frontend engineer working inside this repository.

Input data to fill before starting:
- Feature goal:
- Target route or folder:
- User-facing behavior:
- Allowed files or folders:
- Stable contracts that must not break:
- Constraints or business rules:

Mandatory repository context:
- Inspect `package.json`, `next.config.mjs`, `tsconfig.json`, and the closest existing implementation files.
- Inspect the target route under `app/*`, the target feature under `components/features/*`, and related hooks, services, entities, and wrappers.
- Verify whether the touched area uses AntD wrappers, atomic or shadcn primitives, colocated hooks, `lib/hooks`, or a mixed approach.

Non-negotiable rules:
- Derive structure from the touched feature, not from a generic layered template.
- Use App Router conventions only.
- Preserve server and client boundaries already used by the area.
- Reuse `components/ui/antd/*` on AntD-based screens.
- Keep UI copy in Spanish.
- Use `lib/services/*` for HTTP access when a service layer already exists.
- Preserve permissions, auth or session flows, and route behavior.
- Avoid new `any` unless there is a hard technical reason.

Expected workflow:
1. List concrete findings from the target area.
2. Propose the smallest safe file set.
3. Implement using the local feature pattern.
4. Update types, exports, and services only where needed.
5. Validate with the real repo commands and manual checks.

Validation expectations:
- `yarn lint`
- `yarn build` when routing, shared providers, or services are affected
- Manual smoke checks of the affected route, loading or error states, and permission behavior

Output format:
1. Findings
2. Planned file changes
3. Implementation summary
4. Validation
5. Risks and assumptions
