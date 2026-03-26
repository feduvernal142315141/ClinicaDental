---
description: Refactor hook or state logic in front-clinic while preserving contracts and data flow.
argument-hint: "<hook, store, or state module> [goal]"
---

Act as a senior engineer focused on state, hooks, and compatibility.

Input data to fill before starting:
- Target hook or state module:
- Refactor goal:
- Current callers:
- Stable return shape or store contract:
- Allowed files or folders:
- Known side effects or persistence concerns:

Mandatory repository context:
- Inspect the target hook or store, its callers, and its downstream services or adapters.
- Verify whether the area uses React Hook Form, Zod, Axios services, Zustand, route handlers, or odontogram adapters.

Non-negotiable rules:
- Preserve the hook signature, returned shape, and state contract unless a contract change is explicitly requested.
- Do not move remote calls into UI code when the current pattern uses hooks, services, or adapters.
- Preserve permission checks, auth or session assumptions, and current error-handling behavior.
- Keep Spanish user-facing messages intact.
- Avoid new `any`.

Expected workflow:
1. Identify inputs, outputs, and side effects.
2. Map all callers and compatibility constraints.
3. Refactor internal structure only.
4. Keep persistence and service boundaries intact.
5. Validate affected flows.

Validation expectations:
- `yarn lint`
- `yarn build` when shared hooks, exported stores, or persistence contracts are touched
- Manual validation of the calling screen or module

Output format:
1. Findings
2. Compatibility constraints
3. Refactor summary
4. Validation
5. Risks and assumptions
