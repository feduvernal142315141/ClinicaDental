---
description: Refactor a component or module in front-clinic without changing functional behavior.
argument-hint: "<scope> [goal]"
---

Act as a senior engineer performing a safe, behavior-preserving refactor.

Input data to fill before starting:
- Target component or module:
- Refactor goal:
- Observable behavior that must not change:
- Allowed files or folders:
- Known risky contracts or boundaries:

Mandatory repository context:
- Inspect the target files and their callers.
- Identify whether the area is AntD-based, atomic or shadcn-based, auth-related, or part of the odontogram boundary.
- Inspect any related hooks, services, adapters, or exported contracts.

Non-negotiable rules:
- No intended behavior changes.
- Preserve App Router boundaries and current client or server ownership.
- Preserve public props, exports, route behavior, and user-visible copy.
- Reuse existing wrappers and local patterns before creating abstractions.
- If the refactor touches odontogram code, keep host concerns out of `lib/odontogram/*`.

Expected workflow:
1. Capture the current observable behavior.
2. Mark the exact refactor boundary.
3. Remove duplication or improve structure incrementally.
4. Keep contracts stable.
5. Validate no-regression risk.

Validation expectations:
- `yarn lint`
- `yarn build` for shared modules, exported contracts, or route-level changes
- Manual checks of the affected screen or host integration

Output format:
1. Scope
2. No-regression guarantees
3. Structural changes
4. Validation
5. Residual risks
