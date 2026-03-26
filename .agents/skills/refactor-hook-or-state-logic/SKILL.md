---
name: refactor-hook-or-state-logic
description: Use when refactoring hooks, store logic, form logic, or persistence flows in front-clinic while preserving contracts and side effects.
---

# Refactor Hook Or State Logic

## When to use this skill
- You are improving a hook, form-state module, Zustand store, or adapter-driven state flow.
- The public contract should stay stable.

## Requirements
- Read `AGENTS.md` plus any nested `AGENTS.md` files that apply to the target path.
- Inspect callers, returned values, side effects, and downstream services or adapters first.

## References
- `lib/hooks/*`
- `components/features/*/hooks/*`
- `lib/services/*`
- `lib/odontogram/*`

## Workflow
1. Map the current inputs, outputs, and side effects.
2. Preserve the hook or store contract unless explicitly changing it.
3. Keep remote access in services or adapters, not UI.
4. Preserve permission, auth, and persistence assumptions.
5. Validate the calling screens.

## Validation
- `yarn lint`
- `yarn build` when shared hooks, exports, or persistence contracts change
- Manual flow validation in the caller route

## Good example
- Clean up a form hook using Zod and React Hook Form without changing its returned API or moving its service calls into the component.

## What to avoid
- Changing the hook signature casually
- Introducing new `any`
- Breaking adapter-first persistence in odontogram flows
