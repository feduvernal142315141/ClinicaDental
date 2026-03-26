---
name: refactor-component-or-module
description: Use when improving component or module structure in front-clinic without changing functional behavior or breaking module boundaries.
---

# Refactor Component Or Module

## When to use this skill
- You need to reduce duplication, improve readability, or clean module structure.
- The expected outcome is no functional behavior change.

## Requirements
- Inspect the target file set and its callers.
- Identify public props, exports, route behavior, and module boundaries before editing.

## References
- `app/*`
- `components/features/*`
- `components/ui/antd/*`
- `lib/odontogram/*`

## Workflow
1. Document the observable behavior that must remain unchanged.
2. Set a tight refactor boundary.
3. Reuse existing local abstractions before creating new ones.
4. Preserve exports, props, and route behavior.
5. Validate visually and structurally.

## Validation
- `yarn lint`
- `yarn build` when shared modules or exported contracts are touched
- Manual checks of affected screens or host wrappers

## Good example
- Simplify a large detail component by extracting internal helpers while keeping the same props, services, permissions, and route behavior.

## What to avoid
- Functional changes disguised as refactors
- Cross-feature rewrites
- Pulling host concerns into `lib/odontogram/*`
